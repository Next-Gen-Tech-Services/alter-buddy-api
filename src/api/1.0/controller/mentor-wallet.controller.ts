import { Request, Response } from "express";
import {
  IController,
  IControllerRoutes,
} from "interface";
import { AuthForMentor } from "middleware";
import { MentorWallet } from "model/mentor-wallet.model";
import { getTokenFromHeader, verifyToken, Ok, UnAuthorized } from "utils";

export class MentorWalletController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes.push({
      path: "/wallet/get-mentor-payment-history",
      handler: this.GetMentorWalletHistory,
      method: "POST",
      middleware: [AuthForMentor],
    });
  }

  public async GetMentorWalletHistory(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const mentor = verifyToken(token); // gets mentor.id

      const transactions = await MentorWallet.find({
        mentorId: mentor.id,
      })
        .sort({ createdAt: -1 })
        .lean();

      return Ok(res, {
        total: transactions.length,
        transactions,
      });
    } catch (err) {
      console.error("Error fetching wallet history:", err);
      return UnAuthorized(res, err instanceof Error ? err.message : "Unknown error");
    }
  }
}
