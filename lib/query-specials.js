'use strict';

exports.prepareQuery = prepareQuery;
exports.extractSpecials = extractSpecials;

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
    var parsedData = value.split(' ');

    var populateData = {
      field: parsedData.shift(),
      select: parsedData
    };

    this.populate(populateData.field, populateData.select.join(' '));
  }
};

/**
 * Extract the special params ($sort, $limit, $skip, $select, $populate)
 * from the query and update it
 *
 * @param params {Object} - Contains the query params to update
 *
 * @returns {Object} - Contains the specials parameters to apply
 */
function extractSpecials(params) {
  var specials = ['$sort', '$limit', '$skip', '$select', '$populate'];
  var specialsData = {};

  specials.forEach(function (special) {
    if (params.query[special]) {
      specialsData[special] = params.query[special];
    }

    delete params.query[special];
  });

  return specialsData;
}

/**
 * prepareSpecials - query modifier
 *  Sets up the query properly if _limit, _skip, or _sort is passed in params.
 *  Those same parameters are then removed from _conditions so that we aren't searching
 *  for data with a _limit parameter.
 */
function prepareQuery(query, specialsData){
  var special;

  for (special in specialsData) {
    var handler = handlers[special];

    if (typeof handler !== 'function') {
      return;
    }

    // call the right handler for the special with the query as context
    handler.call(query, specialsData[special]);
  }
}
