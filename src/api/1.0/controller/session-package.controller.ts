import { Request, Response } from "express";
import { SessionPackage } from "../../../model/session-package.model";
import { Ok, UnAuthorized } from "../../../utils";
import { IController, IControllerRoutes } from "interface";
import { AuthForMentor } from "middleware";

export class SessionPackageController implements IController {
  public routes: IControllerRoutes[] = [];

  constructor() {
    this.routes = [
      {
        path: "/session/package",
        method: "POST",
        handler: this.CreatePackage,
      },
      {
        path: "/session/package/:userId",
        method: "GET",
        handler: this.GetUserPackages,
      },
      {
        path: "/session/package/use/:packageId",
        method: "PUT",
        handler: this.UseSessionFromPackage,
      },
      {
        path: "/mentor/packages/:mentorId",
        method: "GET",
        handler: this.GetMentorCreatedPackages,
        middleware: [AuthForMentor],
      },
      {
        path: "/session/package/:id",
        method: "PATCH",
        handler: this.UpdatePackage,
        middleware: [AuthForMentor],
      },
      {
        path: "/session/package/:id",
        method: "DELETE",
        handler: this.DeletePackage,
        middleware: [AuthForMentor],
      },
    ];
  }

  public async CreatePackage(req: Request, res: Response) {
    try {
      const {
        userId,
        mentorId,
        categoryId,
        type,
        totalSessions,
        price,
        expiryDate,
      } = req.body;

      const packageDoc = new SessionPackage({
        userId,
        mentorId,
        categoryId,
        type,
        totalSessions,
        remainingSessions: totalSessions,
        price,
        expiryDate,
      });

      const saved = await packageDoc.save();
      return Ok(res, saved);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetUserPackages(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const packages = await SessionPackage.find({
        userId,
        status: "active",
      })
        .sort({ createdAt: -1 })
        .populate("mentorId categoryId");
      return Ok(res, packages);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async UseSessionFromPackage(req: Request, res: Response) {
    try {
      const { packageId } = req.params;
      const pkg = await SessionPackage.findById(packageId);

      if (!pkg) return UnAuthorized(res, "Package not found");
      if (pkg.remainingSessions <= 0)
        return UnAuthorized(res, "No remaining sessions");

      pkg.remainingSessions -= 1;
      if (pkg.remainingSessions === 0) pkg.status = "expired";
      await pkg.save();

      return Ok(res, pkg);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async GetMentorCreatedPackages(req: Request, res: Response) {
    try {
      const { mentorId } = req.params;

      const packages = await SessionPackage.find({ mentorId }).populate(
        "categoryId"
      );
      return Ok(res, packages);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async UpdatePackage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updated = await SessionPackage.findByIdAndUpdate(id, updates, {
        new: true,
      });

      if (!updated) return UnAuthorized(res, "Package not found");

      return Ok(res, updated);
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }

  public async DeletePackage(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const deleted = await SessionPackage.findByIdAndDelete(id);
      if (!deleted) return UnAuthorized(res, "Package not found");

      return Ok(res, { message: "Deleted successfully" });
    } catch (err) {
      return UnAuthorized(res, err);
    }
  }
}
