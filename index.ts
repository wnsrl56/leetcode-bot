import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const LEETCODE_BASE_URL = 'https://leetcode.com/';
const LEETCODE_ALL_QUESTION_URL = `${LEETCODE_BASE_URL}api/problems/all/`;
const LEETCODE_RECOMMENDED_LIST_URL = `${LEETCODE_BASE_URL}list/api/get_list/xo2bgr0r/`;

const { SLACK_WEBHOOK_URL } = process.env;

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

// Main function
(async () => {
  const { questions } = await getData(LEETCODE_RECOMMENDED_LIST_URL);
  const ids = generateListIds(questions);
  const allData = await getData(LEETCODE_ALL_QUESTION_URL);

  const data1 = getFreeQuestions(allData);
  const data2 = getListQuestions(allData, ids);

  const quizList = pickQuestion([...data1, ...data2]);
  let text = '';

  quizList.forEach(({difficulty: d, stat}) => {
    const item = formatText(
      stat.frontend_question_id,
      stat.question__title,
      stat.question__title_slug,
      DIFFICULTIES[d.level - 1],
    );

    text = `${text}${item}`
  });
  
  postQuestion(text);  
})();

// API call
async function getData(url) {
  const { data } = await axios({
    method: 'get',
    url,
  });
  return data;
}


// Get all non-paid questions
function getFreeQuestions(data, level = 1, mixed = false) {
  return data.stat_status_pairs.filter(
    ({ difficulty: { level: l }, paid_only }) => 
    !paid_only && (mixed ? l <= level : l === level),
  );
}

// Get 60 recommended question IDs
function generateListIds(data) {
  const ids = new Set();
  data.forEach(({ id }) => {
    ids.add(id);
  });
  return ids;
}

// Get 60 recommended questions
function getListQuestions(data, ids) {
  return data.stat_status_pairs.filter(({ stat }) =>
    ids.has(stat.frontend_question_id),
  );
}

// Pick a qestion to post
function pickQuestion(data, length = 3) {  
  const res = [];
  while(length--) {
    let i = Math.floor(Math.random() * data.length);
    res.push(data[i]);
  }
  return res;
}

// Format message
function formatText(
  num: number,
  title: string,
  dir: string,
  difficulty: string,
): string {
  const link = `${LEETCODE_BASE_URL}problems/${dir}/`;
  return `${num}. ${title} - ${difficulty}\n${link}\n`;
}

// Post the generated message to Slack
async function postQuestion(text: string) {
  const { status, config } = await axios({
    method: 'post',
    url: SLACK_WEBHOOK_URL,
    data: { text },
  });
  console.info(status, config.data);
}
