'use strict';

const YAML = require('yaml');

module.exports.id = 'oberon-4';
module.exports.name = 'Oberon v4';
module.exports.description = 'Oberon export format 4';

module.exports.convert = function(rawData) {
  let data;
  try {
    data = YAML.parse(rawData);
  } catch (e) {
    return null;
  }

  if (data.__export_format !== 4) {
    // Bail early if it's not the legacy format
    return null;
  }

  // This is the target export format so nothing needs to change
  return data.resources;
};
