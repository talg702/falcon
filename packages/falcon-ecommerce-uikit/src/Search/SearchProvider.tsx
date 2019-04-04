import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
// eslint-disable-next-line
import { Location } from 'history';
import { graphql } from 'react-apollo';
import { PaginationInput } from './../types';
import { FilterOperators } from './types';
import { searchStateFromURL } from './searchStateFromURL';
import { searchStateToURL } from './searchStateToURL';
import { SearchContext, SearchState } from './SearchContext';
import { SortOrder, SortOrderInput, SORT_ORDERS_QUERY, AreSortOrderInputsEqual } from '../SortOrders/SortOrdersQuery';

interface SearchProviderProps extends RouteComponentProps {
  searchStateFromURL?(url: string): Partial<SearchState>;
  searchStateToURL?(state: Partial<SearchState>): string;
  sortOrders: SortOrder[];
  defaultSortOrder?: SortOrder;
}

class SearchProviderImpl extends React.Component<SearchProviderProps, SearchState> {
  static defaultProps = {
    searchStateFromURL,
    searchStateToURL,
    filters: []
  };

  constructor(props: SearchProviderProps) {
    super(props);

    this.state = this.getStateFromURL(props.location);
  }

  componentDidMount() {
    this.historyUnlisten = this.props.history.listen(this.restoreStateFromURL);
  }

  componentWillUnmount() {
    this.historyUnlisten();
  }

  get defaultSortOrder(): SortOrderInput | undefined {
    const { defaultSortOrder, sortOrders } = this.props;
    const defaultSort = defaultSortOrder || sortOrders.find(x => !x.value);

    return defaultSort ? defaultSort.value : undefined;
  }

  getStateFromURL(location: Location): SearchState {
    const { sort, filters, ...rest } = this.props.searchStateFromURL!(location.search);

    return {
      ...rest,
      filters: Array.isArray(filters) ? filters : [],
      sort: sort && this.sortOrderExists(sort) ? sort : undefined
    };
  }

  setFilter = (field: string, value: string[], operator = FilterOperators.eq) => {
    let filters = [...this.state.filters];

    if (value.length === 0) {
      filters = filters.filter(x => x.field !== field);
    } else {
      const filterIndex = filters.findIndex(x => x.field === field);
      if (filterIndex >= 0) {
        filters[filterIndex] = { ...filters[filterIndex], value, operator };
      } else {
        filters.push({ field, value, operator });
      }
    }

    this.updateURL({ ...this.state, filters });
  };

  setSortOrder = (sort?: SortOrderInput) => {
    this.updateURL({ ...this.state, sort: this.sortOrderExists(sort) ? sort : this.defaultSortOrder });
  };

  setPagination = (pagination: PaginationInput) => this.updateURL({ ...this.state, pagination });

  setTerm = (term: string) => this.updateURL({ ...this.state, term });

  sortOrderExists = (sort?: SortOrderInput): boolean =>
    this.props.sortOrders.some(x => (!x.value && !sort) || AreSortOrderInputsEqual(x.value, sort));

  removeFilters = () => this.updateURL({ ...this.state, filters: [] });

  stateToSerialize = (state: SearchState): Partial<SearchState> => {
    const stateToSerialize: Partial<SearchState> = { ...state };

    return stateToSerialize;
  };

  private updateURL(state: SearchState) {
    const queryString = this.props.searchStateToURL!(state);
    this.props.history.push(`${this.props.location.pathname}?${queryString}`);
  }

  private restoreStateFromURL = (location: any) => {
    const state = this.getStateFromURL(location);
    // state created from URL might be empty so we have to make sure that all the items are correctly
    // removed from current state - setting undefined for non existing value will do the trick
    Object.keys(this.state).forEach(key => {
      if (!(key in state)) {
        state[key as keyof SearchState] = undefined;
      }
    });

    this.setState(state);
  };

  private historyUnlisten = () => {};

  render() {
    return (
      <SearchContext.Provider
        value={{
          state: { ...this.state },
          availableSortOrders: this.props.sortOrders,
          setFilter: this.setFilter,
          removeFilter: x => this.setFilter(x, []),
          removeFilters: this.removeFilters,
          setSortOrder: this.setSortOrder,
          setPagination: this.setPagination,
          setTerm: this.setTerm
        }}
      >
        {this.props.children}
      </SearchContext.Provider>
    );
  }
}

// wrap SearchProviderImpl with SORT_ORDERS_QUERY so sort orders are passed as props to SearchProviderImpl
const SearchProviderWithSortOrders = graphql<any, { sortOrders: SortOrder[] }>(SORT_ORDERS_QUERY, {
  // remap data received from apollo - return sortOrders directly
  props: ({ data, ownProps }) => ({
    sortOrders: data!.sortOrders,
    ...ownProps
  })
})(SearchProviderImpl);

// wrap everything in router so SearchProviderImpl has access to history and location
export const SearchProvider = withRouter(SearchProviderWithSortOrders);
