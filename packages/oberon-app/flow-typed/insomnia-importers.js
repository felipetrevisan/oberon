// @flow

declare module 'oberon-importers' {
  declare module.exports: {
    convert: (
      data: string,
    ) => Promise<{
      type: {
        id: string,
        name: string,
        description: string,
      },
      data: {
        resources: Array<Object>,
      },
    }>,
  };
}
