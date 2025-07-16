import { Request, Response } from "express";
import { GroupSession } from "../../../model/group-session.model";
import { Ok, UnAuthorized } from "../../../utils";
import { IController, IControllerRoutes } from "interface";
import { AuthForMentor } from "middleware";

export class GroupSessionController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes = [
      {
        path: "/group-session",
        method: "POST",
        handler: this.CreateGroupSession,
        middleware: [AuthForMentor],
      },
      {
        path: "/group-session/mentor/:mentorId",
        method: "GET",
        handler: this.GetMentorGroupSessions,
      },
      {
        path: "/group-session/book/:sessionId",
        method: "PUT",
        handler: this.BookGroupSession,
      },
      {
        path: "/group-session/:id",
        method: "PATCH",
        handler: this.UpdateGroupSession,
        middleware: [AuthForMentor],
      },
      {
        path: "/group-session/:id",
        method: "DELETE",
        handler: this.DeleteGroupSession,
        middleware: [AuthForMentor],
      },
    ];
  }

  public async CreateGroupSession(req: Request, res: Response) {
    try {
      const {
        mentorId,
        categoryId,
        title,
        description,
        sessionType,
        price,
        capacity,
        scheduledAt,
        joinLink,
      } = req.body;

      const session = new GroupSession({
        mentorId,
        categoryId,
        title,
        description,
        sessionType,
        price,
        capacity,
        scheduledAt,
        joinLink,
      });

      const saved = await session.save();
      return Ok(res, saved);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetMentorGroupSessions(req: Request, res: Response) {
    try {
      const { mentorId } = req.params;
      const sessions = await GroupSession.find({ mentorId }).populate("categoryId bookedUsers");
      return Ok(res, sessions);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async BookGroupSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const { userId } = req.body;

      const session = await GroupSession.findById(sessionId);
      if (!session) return UnAuthorized(res, "Session not found");

      if (session.bookedUsers.includes(userId)) {
        return UnAuthorized(res, "User already booked");
      }

      if (session.bookedUsers.length >= session.capacity) {
        return UnAuthorized(res, "Session is full");
      }

      session.bookedUsers.push(userId);
      await session.save();

      return Ok(res, session);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async UpdateGroupSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updated = await GroupSession.findByIdAndUpdate(id, updates, {
        new: true,
      });

      if (!updated) return UnAuthorized(res, "Session not found");

      return Ok(res, updated);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async DeleteGroupSession(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const deleted = await GroupSession.findByIdAndDelete(id);
      if (!deleted) return UnAuthorized(res, "Session not found");

      return Ok(res, { message: "Session deleted successfully" });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
}
