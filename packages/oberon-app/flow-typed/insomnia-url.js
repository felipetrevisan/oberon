// @flow

declare module 'oberon-url' {
  declare module.exports: {
    setDefaultProtocol: Function,
    smartEncodeUrl: Function,
    joinUrlAndQueryString: Function,
    deconstructQueryStringToParams: Function,
    extractQueryStringFromUrl: Function,
    buildQueryParameter: Function,
    buildQueryStringFromParams: Function,
  };
}
