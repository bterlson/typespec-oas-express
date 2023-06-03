import { Request, Response } from "express";

const service: Record<string, (req: Request, res: Response) => void> = {
  Widgets_list(req, res) {
    res.status(200).json([]);
  }
}

export default service;