exports.numWordsInNgram = 1;
exports.numNeighbours = 3;
exports.threshold = 0.5;

exports.trainingData = {
  pos: require('../data/Positive_Prompts_TS.js').data,
  neg: require('../data/Negative_Prompts_FML.js').data
};

var classify = {
  nbc: require('./nbc.js'),
 // knn: require('./classifier/knn')
};

exports.algo = 'nbc';

// This is currently only available for the naive bayes algorithm
exports.probability = exports.prob = function( prompt ) {
  if (exports.algo != 'nbc') throw 'Algorithm not available. Use the nbc algorithm';

  return classify['nbc'].getTwssProbability({
    prompt: prompt,
    trainingData: exports.trainingData,
    numWordsInNgram: exports.numWordsInNgram,
    threshold: exports.threshold
  });
};

exports.is = function( prompt ) {
  var params = {
    prompt: prompt,
    trainingData: exports.trainingData,
    numWordsInNgram: exports.numWordsInNgram
  };

  if (exports.algo == 'nbc') {
    params['threshold'] = exports.threshold;
  }
  else if (exports.algo == 'knn') {
    params['numNeighbours'] = exports.numNeighbours;
  }

  return classify[exports.algo].isTwss( params );
}
