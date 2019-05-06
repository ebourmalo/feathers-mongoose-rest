var filterQueryParams = require('feathers-query-filters');

exports.prepareQuery = prepareQuery;

/**
 * Handlers for the special parameters.
 * Invoked with the mongoose query as context
 */
var handlers = {
  $sort: function(value) {
    this.sort(value);
  },
  $limit: function(value) {
    this.limit(value);
  },
  $skip: function(value) {
    this.skip(value);
  },
  $select: function(value) {
    this.select(value);
  },
  $populate: function(value) {
    var fieldsToPopulate = [value];
    var self = this;

    if (value instanceof Array) {
      fieldsToPopulate = value;
    }

    // @todo check existence of fields for select, sort
    // check if field to populate is associated array

    fieldsToPopulate.forEach(function(fieldToPopulate) {
      var parsedData = fieldToPopulate.split(' ');

      var populateData = {
        field: parsedData.shift(),
        select: parsedData
      };

      self.populate(populateData.field, populateData.select.join(' '));
    });


  }
};

/**
 * prepareSpecials - query modifier
 *  Sets up the query properly if _limit, _skip, or _sort is passed in params.
 *  Those same parameters are then removed from _conditions so that we aren't searching
 *  for data with a _limit parameter.
 */
function prepareQuery(query, specialsData) {
  var special;

  for (special in specialsData) {
    var handler = handlers[special];
    var filterValue = specialsData[special];

    if (typeof handler !== 'function' || !filterValue) {
      continue;
    }

    // call the right handler for the special with the query as context
    handler.call(query, filterValue);
  }
}
