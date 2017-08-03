const lbryApi = require('../helpers/lbryApi.js');
const db = require('../models');
const logger = require('winston');
const getAllFreePublicClaims = require('../helpers/functions/getAllFreePublicClaims.js');
const isFreePublicClaim = require('../helpers/functions/isFreePublicClaim.js');
const serveHelpers = require('../helpers/serveHelpers.js');

function checkForLocalAssetByClaimId (claimId, name) {
  return new Promise((resolve, reject) => {
    db.File
      .findOne({where: { name, claimId }})
      .then(result => {
        if (result) {
          resolve(result.dataValues);
        } else {
          resolve(null);
        }
      })
      .catch(error => {
        reject(error);
      });
  });
}

function formatGetResultsToFileInfo ({ name, claim_id, outpoint, file_name, download_path, mime_type, metadata }) {
  return {
    name,
    claimId : claim_id,
    outpoint,
    fileName: file_name,
    filePath: download_path,
    fileType: mime_type,
    nsfw    : metadata.stream.metadata.nsfw,
  };
}

function getAssetByClaimId (fullClaimId, name) {
  return new Promise((resolve, reject) => {
    // 1. check locally for claim
    checkForLocalAssetByClaimId(fullClaimId, name)
    .then(dataValues => {
      // 2. if a result was found, resolve the result
      if (dataValues) {
        logger.debug('found a local file for this claimId');
        // trigger an update check for the file
        /*
        serveHelpers.updateFileIfNeeded(dataValues.name, dataValues.claimId, dataValues.outpoint, dataValues.height);
        */
        // resolve promise
        resolve(dataValues);
      // 2. if not found locally, make a get request
      } else {
        logger.debug('no local file for this claimId');
        // 3. resolve the claim
        lbryApi.resolveUri(`${name}#${fullClaimId}`)
        .then(resolveResult => {
          // if the claim is free and public, then get it
          if (resolveResult.claim && isFreePublicClaim(resolveResult.claim)) {
            lbryApi.getClaim(`${name}#${fullClaimId}`)
            .then(getResult => {
              let fileInfo = formatGetResultsToFileInfo(getResult);
              fileInfo['address'] = resolveResult.claim.address;
              fileInfo['height'] = resolveResult.claim.height;
              resolve(fileInfo);
            })
            .catch(error => {
              reject(error);
            });
          // if not, resolve with no claims
          } else {
            resolve(null);
          }
        })
        .catch(error => {
          reject(error);
        });
      }
    })
    .catch(error => {
      reject(error);
    });
  });
}

module.exports = {
  getAssetByChannel (channelName, name) {
    return new Promise((resolve, reject) => {
      // temporarily throw error
      reject(new Error('channel names are not currently supported'));
      // get the claim id
      // get teh asset by claim Id
    });
  },
  getAssetByShortUrl: function (shortUrl, name) {
    return new Promise((resolve, reject) => {
      // get the full claimId
      serveHelpers.getClaimIdByShortUrl(shortUrl, name)
      // get the asset by the claimId
      .then(claimId => {
        resolve(getAssetByClaimId(claimId, name));
      })
      .catch(error => {
        reject(error);
      });
    });
  },
  getAssetByClaimId (fullClaimId, name) {
    return getAssetByClaimId(fullClaimId, name);
  },
  getAssetByName (name) {
    return new Promise((resolve, reject) => {
      // 1. get a list of the free public claims
      getAllFreePublicClaims(name)
      // 2. check locally for the top claim
      .then(freePublicClaimList => {
        // if no claims were found, return null
        if (!freePublicClaimList) {
          resolve(null);
          return;
        }
        // parse the result
        const claimId = freePublicClaimList[0].claim_id;
        // get the asset
        resolve(getAssetByClaimId(claimId, name));
      })
      .catch(error => {
        reject(error);
      });
    });
  },
};
