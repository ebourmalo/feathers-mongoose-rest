var mongoose = require('mongoose');
var SchemaTypes = mongoose.SchemaTypes;
var ObjectId = mongoose.SchemaTypes.ObjectId

var utils = exports = module.exports = {
  isAnExistingCollection: isAnExistingCollection,
  saveDocument: saveDocument,
  addDocumentToCollectionAndSave: addDocumentToCollectionAndSave,
  getAssociatedModelFromFieldName: getAssociatedModelFromFieldName,
  isASubDocumentsCollection: isASubDocumentsCollection,
  isAReferencedDocumentsCollection: isAReferencedDocumentsCollection
};

/**
 * Check if a field is a proper collection of documents
 * in a given mongoose model
 *
 * @param field {String} - Name of the field to check
 * @param model {Object} - Mongoose model owning the field
 *
 * @returns {boolean}
 */
function isAnExistingCollection(field, model) {
  return isASubDocumentsCollection(field, model)
    || isAReferencedDocumentsCollection(field, model);
}

/**
 * Determine if a property within a model is a collection
 * of sub-documents (called embedded documents as well)
 * Example of property in a mongoose schema:
 *   projects: [new Schema({ ... }]
 *
 * @param property {String} - Name of the property
 * @param model    {Object} - Mongoose model
 *
 * @returns {boolean}
 */
function isASubDocumentsCollection(property, model) {
  var schemaType = getSchemaTypeFromModel(property, model);

  return schemaType instanceof SchemaTypes.DocumentArray;
}

/**
 * Determine if a property within a model is a collection
 * of referenced documents.
 * Example of property in a mongoose schema:
 *   projects: [{type: Schema.Types.ObjectId, ref: 'projects'}]
 *
 * @param property {String} - Name of the property
 * @param model    {Object} - Mongoose model
 *
 * @returns {boolean}
 */
function isAReferencedDocumentsCollection(property, model) {
  var schemaType = getSchemaTypeFromModel(property, model);

  return schemaType instanceof SchemaTypes.Array
    && schemaType.caster instanceof ObjectId;
}

/**
 * Get the corresponding shema type for a property in a model
 *
 * @param property {String} - Name of the property
 * @param model    {Object} - Mongoose model
 *
 * @returns {Object}
 */
function getSchemaTypeFromModel(property, model) {
  return model.schema.paths[property];
}

/**
 * Persist the given document
 *
 * @param document     {Object}   - Document to persist
 * @param callback   {Function}   - Function to invoke when done
 */
function saveDocument(document, callback) {
  document.save(function(error, data) {
    if (error) {
      return callback(error);
    }

    callback(error, data);
  });
}

/**
 * Add an existing item to a embedded collection and save the document
 *
 * @param document   {Object} - Document owner of the collection to update
 * @param collection {String} - Collection to update
 * @param item       {Object} - Item to add to the collection
 * @param callback {Function} - Callback to invoke when done
 */
function addDocumentToCollectionAndSave(document, collection, item, callback) {
  try {
    var added = document[collection].addToSet(item);

    if (added.length === 0) {
      var error = new errors.Forbidden('Item already in collection '
        + collection);
      return callback(error);
    }

    this.saveDocument(document, callback);
  } catch (error) {
    callback(error);
  }
}

/**
 * Get the document just added to a collection and return it
 * via the callback
 *
 * @param document       {Object} - Updated Document that owns the collection
 * @param collectionData {Object} - Contains the collection name
 *                                  and the (sub)document id
 * @param callback     {Function} - Callback to invoke when done
 */
function getDocumentAddedToCollection(document, collectionData, callback) {
  var options = {
    path: collectionData.name,
    match: {
      _id: collectionData.documentId
    }
  };

  document.populate(options, function(error, populatedDocument) {
    if (error) {
      return callback(error);
    }

    var collection = populatedDocument[collectionData.name];
    var addedDocument = collection[0];

    callback(error, addedDocument);
  });
}

function getAssociatedModelFromFieldName(model, fieldName) {
  var field = model.schema.paths[fieldName];
  var associatedModelReference = field.caster.options.ref;

  return model.db.model(associatedModelReference);
}
