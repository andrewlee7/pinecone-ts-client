import { Inference } from '../inference';
import type { PineconeConfiguration } from '../../data';
import { inferenceOperationsBuilder } from '../inferenceOperationsBuilder';
import { PineconeArgumentError } from '../../errors';
import { RerankResult } from '../../pinecone-generated-ts-fetch/inference';

let inference: Inference;
const rerankModel = 'test-model';
const myQuery = 'test-query';

beforeAll(() => {
  const config: PineconeConfiguration = { apiKey: 'test-api-key' };
  const infApi = inferenceOperationsBuilder(config);
  inference = new Inference(infApi);
});

test('Confirm throws error if no documents are passed', async () => {
  try {
    await inference.rerank(rerankModel, myQuery, []);
  } catch (error) {
    expect(error).toEqual(
      new PineconeArgumentError('You must pass at least one document to rerank')
    );
  }
});

test('Confirm docs as list of strings is converted to list of objects with `text` key', async () => {
  const myDocuments = ['doc1', 'doc2'];
  const expectedDocuments = [{ text: 'doc1' }, { text: 'doc2' }];
  const rerank = jest.spyOn(inference._inferenceApi, 'rerank');
  rerank.mockResolvedValue({
    model: 'some-model',
    data: [{}],
    usage: { rerankUnits: 1 },
  } as RerankResult);
  await inference.rerank(rerankModel, myQuery, myDocuments);

  const expectedReq = {
    model: rerankModel,
    query: myQuery,
    documents: expectedDocuments,
    parameters: {},
    rankFields: ['text'],
    returnDocuments: true,
    topN: 2,
  };
  expect(rerank).toHaveBeenCalledWith({ rerankRequest: expectedReq });
});

test('Confirm provided rankFields override default `text` field for reranking', async () => {
  const myDocuments = [
    { text: 'doc1', title: 'title1' },
    { text: 'doc2', title: 'title2' },
  ];
  const rankFields = ['title'];
  const rerank = jest.spyOn(inference._inferenceApi, 'rerank');
  // @ts-ignore
  rerank.mockResolvedValue({ rerankResponse: {} });
  await inference.rerank(rerankModel, myQuery, myDocuments, {
    rankFields,
  });

  const expectedReq = {
    model: rerankModel,
    query: myQuery,
    documents: myDocuments,
    rankFields,
    parameters: {},
    returnDocuments: true,
    topN: 2,
  };
  expect(rerank).toHaveBeenCalledWith({ rerankRequest: expectedReq });
});

test('Confirm error thrown if query is missing', async () => {
  const myQuery = '';
  const myDocuments = [{ text: 'doc1' }, { text: 'doc2' }];
  try {
    await inference.rerank(rerankModel, myQuery, myDocuments);
  } catch (error) {
    expect(error).toEqual(
      new PineconeArgumentError('You must pass a query to rerank')
    );
  }
});

test('Confirm error thrown if model is missing', async () => {
  const rerankModel = '';
  const myDocuments = [{ text: 'doc1' }, { text: 'doc2' }];
  try {
    await inference.rerank(rerankModel, myQuery, myDocuments);
  } catch (error) {
    expect(error).toEqual(
      new PineconeArgumentError(
        'You must pass the name of a supported reranking model in order to rerank' +
          ' documents. See https://docs.pinecone.io/models for supported models.'
      )
    );
  }
});
