const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbpath = path.join(__dirname, "twitterClone.db");

const app = express();
app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => console.log("Server running at http://local"));
  } catch (error) {
    console.log(`Db Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();
const tweetdataformat = (objdetdata) => {
  return {
    username: objdetdata.username,
    tweet: objdetdata.tweet,
    dateTime: objdetdata.date_time,
  };
};
function authentication(request, response, next) {
  let jwtToken;
  const authorheader = request.headers["authorization"];
  if (authorheader !== undefined) {
    jwtToken = authorheader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "saibabusai", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        console.log(payload);
        request.username = payload;
        next();
      }
    });
  }
}

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedpassword = await bcrypt.hash(password, 10);

  const usercheckquery = `select * from user where username = '${username}';`;
  const dbuser = await database.get(usercheckquery);
  if (dbuser === undefined) {
    if (password.length >= 6) {
      const newuserquery = `insert into user (username,password,name,gender)
          values('${username}','${hashedpassword}','${name}','${gender}');`;
      await database.run(newuserquery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkuserindb = ` select * from user where username = '${username}';`;
  const dbuseris = await database.get(checkuserindb);
  if (dbuseris !== undefined) {
    const ispasswordmatch = await bcrypt.compare(password, dbuseris.password);
    if (ispasswordmatch === true) {
      const payload = username;
      const jwtToken = jwt.sign(payload, "saibabusai");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

app.get("/user/tweets/feed/", authentication, async (request, response) => {
  let { username } = request;
  console.log(username);
  const gettweetfetch = `select * from tweet left join user on tweet.user_id = user.user_id where user.user_id in (select following_user_id from follower left join user on follower.follower_user_id = user.user_id where username = '${username}') order by tweet.date_time desc limit 4;`;
  const gettweetsis = await database.all(gettweetfetch);
  response.send(gettweetsis.map((each) => tweetdataformat(each)));
});

app.get("/user/following", authentication, async (request, response) => {
  let { username } = request;
  //console.log(username);
  const getfollowingfetch = `select name  from user where user_id in (select follower_user_id from user left join follower on follower.following_user_id = user.user_id where username = '${username}');`;
  const getfollowingis = await database.all(getfollowingfetch);
  response.send(getfollowingis);
  //response.send(getfolloweris.map((each) => tweetdataformat(each)));
});

app.get("/user/followers", authentication, async (request, response) => {
  let { username } = request;
  //console.log(username);
  const getfollowerfetch = `select name  from user where user_id in (select following_user_id from user left join follower on follower.follower_user_id = user.user_id where username = '${username}');`;
  const getfolloweris = await database.all(getfollowerfetch);
  response.send(getfolloweris);
  //response.send(getfolloweris.map((each) => tweetdataformat(each)));
});

app.get("/tweets/:tweetId/", authentication, async (request, response) => {
  let { username } = request;
  const { tweetId } = request.params;
  const gettweetfetch = `select tweet_id from tweet left join user on tweet.user_id = user.user_id where user.user_id in (select following_user_id from follower left join user on follower.follower_user_id = user.user_id where username = '${username}') order by tweet.date_time desc;`;
  const gettweetsis = await database.all(gettweetfetch);
  response.send(gettweetsis);
  let tweetlist = [];
  for (let each of gettweetsis) {
    tweetlist.push(each.tweet_id);
  }
  const tweetIdmatch = tweetlist.some((eachis) => eachis === tweetId);
  console.log(tweetIdmatch);
});
