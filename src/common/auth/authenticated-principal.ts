export type AuthenticatedPrincipal = {
  issuer: string;
  subject: string;
  clientId: string;
  scopes: ReadonlySet<string>;
};
