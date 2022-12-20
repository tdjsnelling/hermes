import { config } from "dotenv";
import server from "./index";

config();
server({ port: Number(process.env.PORT) || 9000 });
