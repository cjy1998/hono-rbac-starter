import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import userController from "./controller/user.js";
import { ValidationException } from "./exceptions/validation-exception.js";
import { HTTP_STATUS } from "./utils/const.js";
import { fail } from "./utils/response.js";

const app = new Hono();

app.onError((err, c) => {
  if (err instanceof ValidationException) {
    return fail(c, HTTP_STATUS.BAD_REQUEST, err.message);
  }
  if (err instanceof HTTPException) {
    return fail(c, err.status, err.message);
  }
  console.error(err);
  return fail(c, HTTP_STATUS.INTERNAL_SERVER_ERROR, "服务器内部错误");
});

app.route("/user", userController);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
