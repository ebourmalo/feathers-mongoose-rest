var errors = require('feathers').errors.types;
var debug = require('debug')('feathers:mongoose');
var MongooseQuery = require('./mongoose-query');
var MongooseUtils = require('./mongoose-utils');
var filterQuery = require('feathers-query-filters');

module.exports = function(Model) {
  var mongooseService = {};

  /**
   * Find a list of documents
   * Bound to: [GET] -> /:resource
   *
   * @param params     {Object} - Query parameters
   * @param callback {Function} - Function to invoke when done
   */
  mongooseService.find = function(params, callback) {
    debug('Find list of documents', params);

    var filters = filterQuery(params.query);
    var query = Model.find(params.query);

    MongooseQuery.prepareQuery(query, filters);

    query.exec(function(err, data) {
      if (err) {
        return callback(err);
      }
      callback(err, data);
    });
  };

  /**
   * Get a single document for a given id
   * Bound to: [GET] -> /:resource/:id
   *
   * @param id         {Number} - Id of the targeted document
   * @param params     {Object} - Query parameters
   * @param callback {Function} - Function to invoke when done
   */
  mongooseService.get = function(id, params, callback) {
    debug('Get a single document (id ' + id + ')');

    var filters = filterQuery(params.query);
    var query = Model.findById(id, params.query || {});

    // Handle special parameters ($sort, $limit, ..)
    MongooseQuery.prepareQuery(query, filters);

    query.exec(function(error, data) {
      if (error) {
        return callback(error);
      }

      if (!data) {
        return callback(new errors.NotFound('No record found for id ' + id));
      }

      return callback(null, data);
    });
  };

  /**
   * Create a new document
   * Bound to: [POST] -> /:resource/
   *
   * @param data       {Object} - Data used to create the document
   * @param params     {Object} - Query parameters
   * @param callback {Function} - Function to invoke when done
   */
  mongooseService.create = function(data, params, callback) {
    debug('Create a document', data);

    var document = new Model(data);

    MongooseUtils.saveDocument(document, callback);
  };

  /**
   * Update an existing document
   * Bound to: [PUT] -> /:resource/:id
   *
   * @param id         {Number} - Id of the targeted document
   * @param data       {Object} - Data used to create the document
   * @param params     {Object} - Query parameters
   * @param callback {Function} - Function to invoke when done
   */
  mongooseService.update = function(id, data, params, callback) {
    debug('Update the document ' + id);

    delete data.id;
    delete data._id;

    var query = Model.findById(id);

    query.exec(function(error, document) {
      if (error) {
        return callback(error);
      }

      for (key in data) {
        document[key] = data[key];
      }

      document.save(callback);
    });
  };

  /**
   * Delete an existing document
   * Bound to: [DELETE] -> /:resource/:id
   *
   * @param id         {Number} - Id of the targeted document
   * @param params     {Object} - Query parameters
   * @param callback {Function} - Function to invoke when done
   */
  mongooseService.remove = function(id, params, callback) {
    debug('Remove the document ' + id);

    Model.findByIdAndRemove(id, function(err, data) {
      if (err) {
        return callback(err);
      }

      callback(err, data);
    });
  };

  /**
   * Initialize the service
   *
   * @param app {Object} - Main application object
   */
  mongooseService.setup = function(app) {
    this.service = app.service.bind(app);
  };

  /**
   * Find documents in an associated|embed collection of the resource
   * Bound to: [GET] -> /:resource/:id/:collection
   *
   * @param id         {Number} - Id of the targeted document
   * @param collection {String} - Name of the targeted collection
   * @param params     {Object} - Query parameters
   * @param callback {Function} - Function to invoke when done
   */
  mongooseService.findInCollection = function(id, collection, params, callback) {
    debug('Find in collection ' + collection + ' of document ' + id);
g
    if (!MongooseUtils.isAnExistingCollection(collection, Model)) {
      return callback(new errors.NotFound('No record found for collection '
        + collection));
    }

    var query = Model.findById(id);

    if (MongooseUtils.isAReferencedDocumentsCollection(collection, Model)) {
      query.populate(collection);
    }

    query.exec(function(error, data) {
      if (error) {
        return callback(error);
      }

      callback(error, data[collection]);
    });
  };

  /**
   * Add an existing document to an associated|embed collection of the resource
   * Bound to: [POST] -> /:resource/:id/:collection
   *
   * @param id         {Number} - Id of the targeted document
   * @param collection {String} - Name of the targeted collection
   * @param data       {Object} - Data used to add the document to the collection
   * @param params     {Object} - Query parameters
   * @param callback {Function} - Function to invoke when done
   */
  mongooseService.addToCollection = function(id, collection, data, params, callback) {
    debug('Add to collection ' + collection + ' of document ' + id, data);

    if (!MongooseUtils.isAnExistingCollection(collection, Model)) {
      return callback(new errors.NotFound('No record found for collection '
        + collection));
    }

    Model.findById(id)
      .exec(function(error, document) {
        if (error) {
          return callback(error);
        }

        // create document if doesn't yet exist
        if (!data._id && MongooseUtils.isAReferencedDocumentsCollection(collection, Model)) {
          var AssociatedModel = MongooseUtils
            .getAssociatedModelFromFieldName(Model, collection);
          var collectionDocument = new AssociatedModel(data);

          return MongooseUtils.saveDocument(collectionDocument,
            function(error2, newCollectionDocument) {
              if (error2) {
                return callback(error2);
              }

              MongooseUtils.addDocumentToCollectionAndSave(document,
                collection, newCollectionDocument, callback);
            }
          );
        }

        document[collection].push(data);

        MongooseUtils.saveDocument(document, callback);
      });
  };

  /**
   * Get a single document within the associated|embed collection
   * Bound to: [GET] -> /:resource/:id/:collection/:documentId
   *
   * @param id         {Number} - Id of the targeted document
   * @param collection {String} - Name of the targeted collection
   * @param documentId {Number} - Id of the targeted collection document
   * @param params     {Object} - Query parameters
   * @param callback {Function} - Function to invoke when done
   */
  mongooseService.getInCollection = function(id, collection, documentId, params, callback) {
    debug('Get ' + documentId + ' in collection ' + collection + ' of document ' + id);

    if (!MongooseUtils.isAnExistingCollection(collection, Model)) {
      return callback(new errors.NotFound('No record found for collection '
        + collection));
    }

    Model.findById(id)
      .exec(function(error, document) {
        if (error) {
          return callback(error);
        }

        var itemNotFound = document[collection].indexOf(documentId) === -1;

        if (itemNotFound) {
          var errorLabel = 'No record found for item '+ documentId
            + ' in collection ' + collection;
          return callback(new errors.NotFound(errorLabel));
        }

        document.populate({path: collection, match: { _id: documentId}},
          function(error, populatedDocument) {
            if (error) {
              return callback(error);
            }

            callback(error, populatedDocument[collection][0]);
          });
      });
  };

  /**
   * Remove a document from the associated|embed collection of the resource
   * Bound to: [DELETE] -> /:resource/:id/:collection/:documentId
   *
   * @param id         {Number} - Id of the targeted document
   * @param collection {String} - Name of the targeted collection
   * @param documentId {Number} - Id of the document to remove from the collection
   * @param params     {Object} - Query parameters
   * @param callback {Function} - Function to invoke when done
   */
  mongooseService.removeFromCollection = function(id, collection, documentId, params, callback) {
    debug('Remove ' + documentId + ' from collection ' + collection + ' of document ' + id);

    if (!MongooseUtils.isAnExistingCollection(collection, Model)) {
      return callback(new errors.NotFound('No record found for collection '
        + collection));
    }

    Model.findById(id)
      .exec(function(error, document) {
        if (error) {
          return callback(error);
        }

        document[collection].remove(documentId);
        MongooseUtils.saveDocument(document, callback);
      });
  };

  return mongooseService;
};
