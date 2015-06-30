var errors = require('feathers').errors.types;
var querySpecials = require('./query-specials');

module.exports = function(Model, options) {

  var options = options || {};

  var mongooseService = {
    find: function(params, callback) {
      var specialParams = querySpecials.extractSpecials(params);
      var query = Model.find(params.query);

      // Handle special parameters ($sort, $limit, ..)
      querySpecials.prepareQuery(query, specialParams);

      // Execute the query
      query.exec(function(err, data) {
        if (err) {
          return callback(err);
        }
        callback(err, data);
      });
    },

    get: function(id, params, callback) {
      var specialParams = querySpecials.extractSpecials(params);
      var query = Model.findById(id, params.query || {});

      // Handle special parameters ($sort, $limit, ..)
      querySpecials.prepareQuery(query, specialParams);

      // Execute the query
      query.exec(function(error, data) {
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
