import { config } from "dotenv";
import server from "./index";

config();
server({
  port: Number(process.env.PORT) || undefined,
  srv: process.env.MONGO_SRV,
  db: process.env.MONGO_DB,
});
