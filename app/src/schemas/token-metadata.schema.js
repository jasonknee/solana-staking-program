const buildMetadataSchema = (data = {}) => ({
  ...data,
  name: data.name?.replace(/\W/g, '')  ?? null,
  symbol: data.symbol?.replace(/\W/g, '') ?? null,
  description: data.description ?? null,
  sellerFeeBasisPoints: data.seller_fee_basis_points ?? null,
  externalUrl: data.external_url ?? null,
  image: data.image ?? null,
  attributes: data.attributes ?? [],
  collection: data.collection ?? null,
  properties: data.properties ?? null
});

export default buildMetadataSchema;