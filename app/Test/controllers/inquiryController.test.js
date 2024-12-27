const chai = require('chai');
const supertest = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { StatusCodes } = require('http-status-codes');
const inquiryModel = require('../../models/inquiryModel');
const message = require('../../utils/message');
const { response } = require('../../utils/enum');
const {
  pagination,
  invalidInquiryData,
  validInquiryData,
} = require('../data/inquiryData');
const app = require('../../../server');
const expect = chai.expect;

let mongoServer;
before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  const testDbUri = `${uri}cuentistaTest`;
  await mongoose.connect(testDbUri);
});

after(function () {
  mongoose.connection.dropDatabase();
  mongoose.connection.close();
  mongoServer.stop();
});

let createdInquiryId;

describe('Inquiry controller', function () {
  this.timeout(10000);

  describe('createInquiry', () => {
    it('should return validation error if any field is empty', async () => {
      const res = await supertest(app)
        .post('/api/inquiry/create-inquiry')
        .send(invalidInquiryData)
        .expect(StatusCodes.OK);

      expect(res.body.status).to.equal(response.ERROR);
      expect(res.body.statusCode).to.equal(StatusCodes.BAD_REQUEST);
      expect(res.body.message).to.equal('First name cannot be empty.');
    });

    it('should create a new inquiry successfully', async () => {
      const res = await supertest(app)
        .post('/api/inquiry/create-inquiry')
        .send(validInquiryData)
        .expect(StatusCodes.OK);

      expect(res.body.status).to.equal(response.SUCCESS);
      expect(res.body.statusCode).to.equal(StatusCodes.CREATED);
      expect(res.body.data).to.have.property('id');
      expect(res.body.message).to.equal(
        `Inquiry ${message.ADDED_SUCCESSFULLY}`
      );
      createdInquiryId = res.body.data.id;
    });
  });

  describe('List of Inquiry', async () => {
    it('should return list of inquiries', async () => {
      const res = await supertest(app)
        .post('/api/inquiry/list-of-inquiry')
        .send(pagination)
        .expect(StatusCodes.OK);

      expect(res.body.status).to.equal(response.SUCCESS);
      expect(res.body.statusCode).to.equal(StatusCodes.OK);
      expect(res.body.data.listOfInquiry).to.have.lengthOf(1);
    });

    it('should return error 404 if no inquiries found', async () => {
      await inquiryModel.deleteMany({});
      const res = await supertest(app)
        .post('/api/inquiry/list-of-inquiry')
        .send(pagination)
        .expect(StatusCodes.OK);

      expect(res.body.status).to.equal(response.ERROR);
      expect(res.body.statusCode).to.equal(StatusCodes.NOT_FOUND);
      expect(res.body.message).to.equal(`Inquiry ${message.NOT_FOUND}`);
    });
  });

  describe('Update inquiry', async () => {
    it('should return 404 if inquiry not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await supertest(app)
        .put(`/api/inquiry/update-inquiry/${fakeId}`)
        .expect(StatusCodes.OK);

      expect(res.body.status).to.equal(response.ERROR);
      expect(res.body.statusCode).to.equal(StatusCodes.NOT_FOUND);
      expect(res.body.message).to.equal(`Inquiry ${message.NOT_FOUND}`);
    });

    it('should update the inquiry', async () => {
      const createInquiry = await supertest(app)
        .post('/api/inquiry/create-inquiry')
        .send(validInquiryData);

      createdInquiryId = createInquiry.body.data.id;

      const res = await supertest(app)
        .put(`/api/inquiry/update-inquiry/${createdInquiryId}`)
        .expect(StatusCodes.OK);

      expect(res.body.status).to.equal(response.SUCCESS);
      expect(res.body.statusCode).to.equal(StatusCodes.ACCEPTED);
      expect(res.body.message).to.equal(message.RESOLVED_SUCCESSFULLY);
    });

    it('should return 400 if inquiry is already resolved', async () => {
      const res = await supertest(app)
        .put(`/api/inquiry/update-inquiry/${createdInquiryId}`)
        .expect(StatusCodes.OK);

      expect(res.body.status).to.equal(response.ERROR);
      expect(res.body.statusCode).to.equal(StatusCodes.BAD_REQUEST);
      expect(res.body.message).to.equal(message.ALREADY_RESOLVED);
    });
  });
});
