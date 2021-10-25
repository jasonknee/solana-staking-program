const buildAssetSchema = (data = {}) => ({
  ...data,
  name: data.name?.replace(/\W/g, '')  ?? null,
  symbol: data.symbol?.replace(/\W/g, '') ?? null,
  uri: data.uri?.replace('\u0000','') ?? null,
  sellerFeeBasisPoints: data.sellerFeeBasisPoints ?? null,
  creators: data.creators ?? null,
  network: data.network ?? null,
  tokenID: data.tokenID ?? null,
  id: data.id ?? null,
  tokenData: data.tokenData ?? null
});

export default buildAssetSchema;