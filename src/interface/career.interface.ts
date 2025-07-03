import { Request, Response } from "express";

export interface IRoute {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  handler: (req: Request, res: Response) => void;
  middleware?: any[];
}

export interface IController {
  routes: IRoute[];
}
