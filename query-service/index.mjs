import Fastify from "fastify";
import cors from "@fastify/cors";
import { request } from "undici";

const fastify = Fastify({
  logger: { target: "pino-pretty", msgPrefix: "QUERY DATA SERVICE " },
});

process.on("unhandledRejection", (reason) => {
  console.error(reason);
});

await fastify.register(cors, {});

const posts = {};

// returning posts data to a client
fastify.get("/posts", async (req, reply) => {
  return posts;
});

// listen for events and aggregate posts
fastify.post("/events", async (req, reply) => {
  const { type, data } = req.body;

  handleEvent(type, data);

  reply.send({});
});

const handleEvent = (type, data) => {
  if (type === "PostCreated") {
    const { id, title } = data;

    posts[id] = { id, title, comments: [] };
  }
  if (type === "CommentCreated") {
    const { id, content, postId, status } = data;

    const post = posts[postId];

    post.comments.push({ id, content, status });
  }

  if (type === "CommentUpdated") {
    const { id, content, postId, status } = data;

    const post = posts[postId];

    const comment = post.comments.find((comment) => {
      return comment.id === id;
    });

    comment.status = status;
    comment.content = content;
  }
};

const start = async () => {
  try {
    await fastify.listen({ port: 4002, host: "0.0.0.0" });
    const res = await request("http://event-bus-srv:4005/events");

    const data = await res.body.json();

    for (let event of data) {
      console.log("Processing the event: ", event.type);
      if (event?.type) handleEvent(event.type, event.data);
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
