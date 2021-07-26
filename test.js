'use strict';

const chakram = require('chakram');
const expect = chakram.expect;
const api = require('C:/api/api-automation-webinar/specs/utils/api.js');
const { post } = require('chakram/lib/methods');
chakram.addProperty("successful", function (respObj) {
  const isStatus200 = respObj.response.statusCode === 200;
  this.assert(isStatus200, 'expected ' + respObj.response.statusCode + ' to be 200');
});
chakram.addProperty("created", function (respObj) {
  const isStatus201 = respObj.response.statusCode === 201;
  this.assert(isStatus201, 'expected ' + respObj.response.statusCode + ' to be 201');
});
/*Először is fogalmam sincs hogy ez az async-es megoldás vagy a promise-ozás a jobb
  csak a kényelem miatt választottam. Van még elég sok ötletem csak gondoltam jobb előbb tisztázni
  hogy mennyire vagyok rossz vágányon. Próbáltam saját property-t létrehozni a chakramban, sémákat ilyesmiket.*/
  
chakram.addSchema('idSearch', {
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "userId": {
          "type": "integer"
        },
        "id": {
          "type": "integer"
        },
        "title": {
          "type": "string"
        },
        "body": {
          "type": "string"
        }
      },
      "required": [
        "userId",
        "id",
        "title",
        "body"
      ]
    }
  },
  "required": [
    "data"
  ]
});




describe('Posts', () => {
  describe('Create', () => {
   
    it('Should be able to add a new post without a specific id', async function () {
      let myPost = {
        title: 'title',
        body: 'body',
        userId: 1
      }
      const response = await chakram.post(api.url('posts'), myPost);
      expect(response.body.data).be.defined
      expect(response).to.be.created
      expect(response.body.data.id).to.be.defined
      myPost.id = response.body.data.id
      const receivedPost = await chakram.get(api.url('posts/' + myPost.id))
      expect(receivedPost.status).to.be.defined
      expect(receivedPost).to.be.successful
      expect(receivedPost).have.json('data', myPost)
      return chakram.wait()

    })

    it('Should refuse to add a post when a post with the given id already exists', async function () {
      let myPost = {
        title: 'title',
        body: 'body',
        userId: 1,
        id: 1
      }
      const response = await chakram.post(api.url('posts'), myPost);
      expect(response).to.have.status(500)
      expect(response.response.body).to.include('Insert failed, duplicate id')
      return chakram.wait()

    })
     /*Én úgy gondoltam hogy csak úgy ne lehessen választani id-t hanem azt csak a "rendszer" legyen képes generálni*/
    it('Should refuse to add a post with chosen id', async function () {
      await chakram.delete(api.url('posts/' + 200))
      let myPost = {
        title: 'title',
        body: 'body',
        userId: 1,
        id: 200
      }
      const response = await chakram.post(api.url('posts'), myPost);

      expect(response).to.have.status(500)
      expect(response.response.body).to.include('Error')
      return chakram.wait()

    })
     /*Ha egy id-t már egyszer kiadott akkor többször már ne adja ki hiába törölve lesz.
       Ez nem tudom mennyire probléma ezt csak úgy gondoltam hogy nem szerencsés*/
     it('Should not give the same id twice', async function () {
      let postResponse = await chakram.post(api.url('posts'))
      const addedPostId = postResponse.response.body.data.id
      await chakram.delete(api.url('posts/' + addedPostId))
      postResponse = await chakram.post(api.url('posts'))
      expect(postResponse).be.created
      expect(postResponse.body.data.id).to.be.defined
      expect(postResponse.body.data.id).not.to.equal(addedPostId)
      return chakram.wait()

    })
    /*Csak megfelelő adatokkal kellene szerintem elfogadnia, az hogy ilyenkor
      milyen status code-nak kellene jönni abban nem vagyok biztos.
      Az erroros rész az onnan jön hogy tudom hogy amikor nem tud valamit létrehozni
      akkor egy ilyen üzenet jön*/
    it('Should not accept a post without user id/title/body ', async function () {
      const response = await chakram.post(api.url('posts'))
      expect(response.response.body.toString()).to.include('Error')
      expect(response).to.have.status(500)
      return chakram.wait()

    })
  })
  describe("Read", () => {
    before(async function () {
      this.data = await require('C:/api/api-automation-webinar/server/data.json');
    })

    it("should response with datas", async function () {
      const response = await chakram.get(api.url('posts'))
      expect(response).to.be.successful
      expect(response.response.body.data).to.be.defined
      expect(response.response.body.data.length).to.be.greaterThan(0)
      return chakram.wait()
    })

    /*Ez néha megbukik de az a hiba valahol máshol keresendő
      valahol valami egy pár ezred másodpercet elcsúszik de általában jó*/
    it("should response with correct datas", async function () {
      const response = await chakram.get(api.url('posts'))
      expect(response).to.be.successful
      expect(response).to.have.json('data', this.data.posts)
    })
    /*Itt kipróbáltam a schema hasonlítást de mivel bármilyen objektumot tudok posoltni
      ez megbukik*/
    it("should response with correct data for specific id-s", async function () {
      const response = await chakram.get(api.url('posts/1'))
      expect(response).to.have.status(200)
      expect(response.response).to.have.schema('idSearch');
      expect(response).to.have.json('data', this.data.posts[0])
      return chakram.wait()
    })
  })
  describe("Relationships", () => {
    it("should be able to embed child properties", async function () {
      const response = await chakram.get(api.url('posts/2?_embed=comments'))
      expect(response).to.have.status(200)
      expect(response.response.body.data).to.have.ownProperty('comments')
    })
    /*Itt ellenőrzöm hogy megjelenített kommentek tényleg oda tartoznak-e ahhoz a posthoz */
    it("Should be embed child properties with proper postId-s", async function () {
      const response = await chakram.get(api.url('posts/2?_embed=comments'))
      const comments = response.response.body.data.comments
      expect(response).to.have.status(200)
      expect(comments.every(comment => comment.postId === 2)).to.be.true
      return chakram.wait()
    })

    /*Sajnos bármit tudok itt megadni és beteszi egy property-be üres tömbként ami elég furcsán néz ki
      gondolom ez baj*/ 
    it("should be  able to embed  only valid child properties", async function () {
      const response = await chakram.get(api.url('posts/2?_embed=It_should_not_appear'))
      expect(response).to.have.status(500)
      expect(response.response.body.data).not.to.have.ownProperty('It_should_not_appear')
      return chakram.wait()
    })
  })
});





