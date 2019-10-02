import gql from 'graphql-tag';
import { Mutation } from '@deity/falcon-data';
import { SetCheckoutAddressInput } from '@deity/falcon-shop-extension';

export const SET_BILLING_ADDRESS = gql`
  mutation SetBillingAddress($input: CheckoutAddressInput!) {
    setBillingAddress(input: $input)
  }
`;

export type SetBillingAddressResponse = {
  setBillingAddress: boolean;
};

export class SetBillingAddressMutation extends Mutation<SetBillingAddressResponse, SetCheckoutAddressInput> {
  static defaultProps = {
    mutation: SET_BILLING_ADDRESS
  };
}
