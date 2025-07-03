import { Request, Response } from 'express';
import CareerApplication from '../../../model/CareerApplication'

export const createApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, phone, category, description } = req.body;

    // Simple validation
    if (!firstName || !lastName || !phone || !category) {
      res.status(400).json({ message: 'All required fields must be filled.' });
      return;
    }

    // Optional: check description length server-side
    if (description && description.replace(/\s+/g, '').length > 100) {
      res.status(400).json({ message: 'Description must be at most 100 characters.' });
      return;
    }

    const application = new CareerApplication({
      firstName,
      lastName,
      phone,
      category,
      description,
    });

    await application.save();

    res.status(201).json({ message: 'Application submitted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while submitting application.' });
  }
};
