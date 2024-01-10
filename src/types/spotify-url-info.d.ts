declare module 'spotify-url-info' {
  const spotifyUrlInfo: (fetch: unknown) => {
    getData: (url: string, opts: object) => Promise<{
      artists: { name: string }[],
      duration: number,
      coverArt: {
        sources: { url: string }[]
      } | null,
      name: string,
      title: string,
      subtitle: string,
      uri: string,
      trackList: { uri: string }[]
    }>
  }
  // noinspection JSUnusedGlobalSymbols
  export default spotifyUrlInfo
}
