import { createExpressApp } from "../server";

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  const app = await createExpressApp();
  return app(req, res);
}
