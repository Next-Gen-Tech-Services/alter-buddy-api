import { Request, Response } from "express";
import { IController, IControllerRoutes } from "interface";
import { AuthForAdmin, AuthForMentor } from "middleware";
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
    this.routes.push({
      path: "/admin/mentor-wallet/history",
      handler: this.GetAllMentorWalletHistoryForAdmin,
      method: "GET",
      middleware: [AuthForAdmin],
    });
  }

  public async GetMentorWalletHistory(req: Request, res: Response) {
    try {
      const token = getTokenFromHeader(req);
      const mentor = verifyToken(token); // gets mentor.id

      const transactions = await MentorWallet.find({
        mentorId: mentor.id,
      })
        .populate("mentorId", "name") // populating mentor's name
        .populate("userId", "name") // populating user's name
        .sort({ createdAt: -1 })
        .lean();

      return Ok(res, {
        total: transactions.length,
        transactions,
      });
    } catch (err) {
      console.error("Error fetching wallet history:", err);
      return UnAuthorized(
        res,
        err instanceof Error ? err.message : "Unknown error"
      );
    }
  }

  public async GetAllMentorWalletHistoryForAdmin(req: Request, res: Response) {
    try {
      const transactions = await MentorWallet.find({})
        .populate("mentorId", "name")
        .populate("userId", "name")
        .sort({ createdAt: -1 })
        .lean();

      return Ok(res, transactions);
    } catch (err) {
      console.error("Admin mentor wallet history error:", err);
      return UnAuthorized(res, err instanceof Error ? err.message : "Unknown error");
    }
  }

}
