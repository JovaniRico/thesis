const db = require('../db/dbConfig.js');
const logger = require('../logger.js');

const dbCallback = (action, callback) =>
  (err, res) => {
    if (err) {
      logger.log('error', `Cannot ${action}`, err);
      callback(err, null);
    } else {
      callback(null, res);
    }
  };

const isPresent = (data, type) => {
  if (!data.length) {
    logger.log('info', type, 'is empty');
    return false;
  }
  return true;
};

module.exports = {
  saveMessage: (message, callback) => {
    const query = `INSERT INTO MESSAGE (text_msg, org_id, user_id) SELECT * FROM (select "${message}", (SELECT org_id from USER where username = "Charlie"),(SELECT id from USER where username = "Charlie")) AS temp WHERE NOT EXISTS (SELECT id FROM MESSAGE WHERE text_msg= "${message}" and user_id = (SELECT id from USER where username = "Charlie"))LIMIT 1`;
    db.query(query, dbCallback('Save Message', callback));
  },
  saveEmotions: (emotions, message, callback) => {
    if (!emotions || !isPresent(Object.keys(emotions), 'emotions')) {
      callback(null, []);
      return;
    }
    const query = `INSERT INTO EMOTIONS (anger,disgust,fear,joy,sadness,msg_id) VALUES ("${emotions.anger}","${emotions.disgust}","${emotions.fear}","${emotions.joy}","${emotions.sadness}", (SELECT id FROM MESSAGE where text_msg= "${message}" LIMIT 1))`;
    db.query(query, dbCallback('Save Emotions', callback));
  },
  saveTaxonomy: (taxonomy, message, callback) => {
    if (!taxonomy || !isPresent(taxonomy, 'taxonomy')) {
      callback(null, []);
      return;
    }
    taxonomy.forEach((value) => {
      const query = `INSERT INTO TAXONOMY (label,score,msg_id) VALUES ("${value.label}","${value.score}", (SELECT id FROM MESSAGE WHERE text_msg= "${message}" LIMIT 1))`;
      db.query(query, dbCallback('Save Taxonomy', (err, res) => {}));
    });
    callback(null, taxonomy);
  },
  saveKeywords: (keywords, message, callback) => {
    if (!keywords || !isPresent(keywords, 'keywords')) {
      callback(null, []);
      return;
    }
    keywords.forEach((keyword) => {
      const query = `INSERT INTO KEYWORDS (relevance,keyword_text,msg_id) VALUES ("${keyword.relevance}","${keyword.text}", (SELECT id FROM MESSAGE WHERE text_msg= "${message}" LIMIT 1))`;
      db.query(query, dbCallback('Save Keywords', (err, res) => {}));
    });
    callback(null, keywords);
  },
  // getEmotions org as first argument?
  getEmotions: callback => {
    const query = 'SELECT SUM(anger) as anger,SUM(disgust)as disgust,SUM(fear) as fear,SUM(joy) as joy,SUM(sadness) as sadness FROM EMOTIONS e inner join MESSAGE m on e.msg_id = m.id inner join USER u on m.user_id = u.id group by username';
    db.query(query, dbCallback('Get Emotions', callback));
  },
  getMessages: (data, callback) => {
    const query = `SELECT m.text_msg from MESSAGE m inner join EMOTIONS e on e.id = m.id WHERE e.created_at BETWEEN "'${data.startDate}%'" AND "'${data.endDate}%'"`;
    db.query(query, dbCallback('Get Messages', callback));
  },
  getTaxonomy: callback => {
    const query = 'SELECT label, SUM(score), COUNT(*) AS times FROM TAXONOMY GROUP BY label';
    db.query(query, dbCallback('Get taxonomy', callback));
  },
  getKeywords: callback => {
    const query = 'SELECT keyword_text, SUM(relevance), COUNT(*) AS times FROM KEYWORDS GROUP BY keyword_text';
    db.query(query, dbCallback('Get keywords', callback));
  },
  getEmotionsOverTime: (data, callback) => {
    let query = '';
    if (data === null) {
      query = 'SELECT DATE(created_at) AS Date, HOUR(created_at) AS Hr, SUM(anger) as anger,SUM(disgust)as disgust,SUM(fear) as fear,SUM(joy) as joy,SUM(sadness) as sadness FROM EMOTIONS GROUP BY Date, Hr';
    } else {
      query = `SELECT DATE(created_at) AS Date, HOUR(created_at) AS Hr, SUM(anger) as anger,SUM(disgust)as disgust,SUM(fear) as fear,SUM(joy) as joy,SUM(sadness) as sadness FROM EMOTIONS WHERE created_at BETWEEN date('${data.startDate}') AND date('${data.endDate}') GROUP BY Hr,Date;`;
    }
    db.query(query, dbCallback('Get emotions over time', (err, result) => {
      const cumulativeEmotions = { anger: 0, disgust: 0, fear: 0, joy: 0, sadness: 0 };
      if (!err) {
        for (let i = 0; i < result.length; i++) {
          for (let key in cumulativeEmotions) {
            cumulativeEmotions[key] += result[i][key];
            result[i][key] = cumulativeEmotions[key];
          }
        }
        callback(null, result);
      }
    }));
  },
  getAllEmotions: callback => {
    const query = 'SELECT anger, disgust, fear, joy, sadness FROM EMOTIONS';
    db.query(query, dbCallback('Get All Emotions', callback));
  },
};
