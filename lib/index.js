// Functions for modifying data / params
var prepareSpecials = require('./query.prepareSpecials');

module.exports = function(Model, options) {

  var options = options || {};

  var mongooseService = {
    find: function(params, callback) {
      // Build the query.
      var query = Model.find(params.query);

      // Handle $sort, $limit, and $skip
      prepareSpecials(query, params, callback, function(err, query, params, callback){
        // Execute the query
        query.exec(function(err, data) {
          if (err) {
            return callback(err);
          }
          callback(err, data);
        });
      });
    },

    get: function(id, params, callback) {
      Model.findById(id, params.query || {}, function(error, data) {
        if(error) {
          return callback(error);
        }

        if(!data) {
          return callback(new errors.NotFound('No record found for id ' + id));
        }

        return callback(null, data);
      });
    },

    create: function(data, params, callback) {
      new Model(data).save(function (err, data) {
        if (err) {
          return callback(err);
        }
        // Send response.
        callback(null, data);
      });
    },

    update: function(id, data, params, callback) {
      // Remove id and/or _id.
      delete data.id;
      delete data._id;
      // Run the query
      Model.findByIdAndUpdate(id, data, { upsert: false }, function(err, data) {
        if (err) {
          return callback(err);
        }
        // Send response.
        callback(err, data);
      });
    },

    remove: function(id, params, callback) {
      // Run the query
      Model.findByIdAndRemove(id, function(err, data) {
        if (err) {
          return callback(err);
        }
        // Send response.
        callback(err, data);
      });
    },

    setup: function(app) {
      this.service = app.service.bind(app);
    }
  };

  return mongooseService;
};
