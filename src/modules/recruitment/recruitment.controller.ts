import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { JobOpening } from '../../models/JobOpening';
import { Candidate } from '../../models/Candidate';
import { Interview } from '../../models/Interview';

export const getJobs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { status, departmentId } = req.query;

    const filter: any = { organizationId: orgId };
    if (status && status !== 'all') filter.status = status;
    if (departmentId && departmentId !== 'all') filter.departmentId = departmentId;

    const jobs = await JobOpening.find(filter)
      .populate('departmentId', 'name color')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: jobs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const {
      title,
      code,
      departmentId,
      employmentType,
      location,
      openingsCount,
      salaryMin,
      salaryMax,
      currency,
      experienceLevel,
      description,
      requirements,
      status,
      deadline
    } = req.body;

    if (!title) {
      res.status(400).json({ success: false, message: 'Job title is required' });
      return;
    }

    const jobCount = await JobOpening.countDocuments({ organizationId: orgId });
    const jobCode = code ? code.toUpperCase() : `SPX-JOB-${String(jobCount + 1).padStart(2, '0')}`;

    const job = new JobOpening({
      organizationId: orgId,
      title,
      code: jobCode,
      departmentId: departmentId || undefined,
      employmentType: employmentType || 'full_time',
      location: location || 'Headquarters / Hybrid',
      openingsCount: Number(openingsCount) || 1,
      salaryMin: Number(salaryMin) || 0,
      salaryMax: Number(salaryMax) || 0,
      currency: currency || 'USD',
      experienceLevel: experienceLevel || 'mid',
      description: description || '',
      requirements: requirements || [],
      status: status || 'published',
      deadline: deadline ? new Date(deadline) : undefined
    });

    await job.save();
    res.status(201).json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getJobById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id } = req.params;

    const job = await JobOpening.findOne({ _id: id, organizationId: orgId }).populate('departmentId', 'name color');
    if (!job) {
      res.status(404).json({ success: false, message: 'Job opening not found' });
      return;
    }

    res.status(200).json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id } = req.params;

    const job = await JobOpening.findOneAndUpdate({ _id: id, organizationId: orgId }, req.body, { new: true });
    if (!job) {
      res.status(404).json({ success: false, message: 'Job opening not found' });
      return;
    }

    res.status(200).json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCandidates = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { jobId, stage, search } = req.query;

    const filter: any = { organizationId: orgId };
    if (jobId && jobId !== 'all') filter.jobId = jobId;
    if (stage && stage !== 'all') filter.stage = stage;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const candidates = await Candidate.find(filter)
      .populate('jobId', 'title code departmentId')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: candidates });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCandidate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { jobId, firstName, lastName, email, phone, resumeUrl, coverLetter, portfolioUrl } = req.body;

    if (!jobId || !firstName || !lastName || !email) {
      res.status(400).json({ success: false, message: 'Job, first name, last name, and email are required' });
      return;
    }

    const candidate = new Candidate({
      organizationId: orgId,
      jobId,
      firstName,
      lastName,
      email,
      phone: phone || '',
      resumeUrl: resumeUrl || '',
      coverLetter: coverLetter || '',
      portfolioUrl: portfolioUrl || '',
      stage: 'applied'
    });

    await candidate.save();

    // Increment applicants counter on parent job
    await JobOpening.findByIdAndUpdate(jobId, { $inc: { totalApplicants: 1 } });

    res.status(201).json({ success: true, data: candidate });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCandidateStage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id } = req.params;
    const { stage, rating } = req.body;

    const candidate = await Candidate.findOne({ _id: id, organizationId: orgId });
    if (!candidate) {
      res.status(404).json({ success: false, message: 'Candidate not found' });
      return;
    }

    const prevStage = candidate.stage;
    if (stage) candidate.stage = stage;
    if (rating) candidate.rating = Number(rating);

    await candidate.save();

    // If candidate was just hired, increment hiredCount on JobOpening
    if (stage === 'hired' && prevStage !== 'hired') {
      await JobOpening.findByIdAndUpdate(candidate.jobId, { $inc: { hiredCount: 1 } });
    }

    res.status(200).json({ success: true, data: candidate });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addCandidateNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id } = req.params;
    const { text, authorName } = req.body;

    const candidate = await Candidate.findOne({ _id: id, organizationId: orgId });
    if (!candidate) {
      res.status(404).json({ success: false, message: 'Candidate not found' });
      return;
    }

    candidate.notes.push({
      authorName: authorName || 'Interviewer',
      text,
      createdAt: new Date()
    });

    await candidate.save();
    res.status(200).json({ success: true, data: candidate });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCandidateOffer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { id } = req.params;
    const { salary, currency, joiningDate, status } = req.body;

    const candidate = await Candidate.findOne({ _id: id, organizationId: orgId });
    if (!candidate) {
      res.status(404).json({ success: false, message: 'Candidate not found' });
      return;
    }

    candidate.offerDetails = {
      salary: Number(salary) || candidate.offerDetails?.salary,
      currency: currency || candidate.offerDetails?.currency || 'USD',
      joiningDate: joiningDate ? new Date(joiningDate) : candidate.offerDetails?.joiningDate,
      status: status || 'sent',
      sentAt: new Date()
    };

    if (status === 'accepted') {
      candidate.stage = 'hired';
      await JobOpening.findByIdAndUpdate(candidate.jobId, { $inc: { hiredCount: 1 } });
    } else if (candidate.stage !== 'hired') {
      candidate.stage = 'offer';
    }

    await candidate.save();
    res.status(200).json({ success: true, data: candidate });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInterviews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const interviews = await Interview.find({ organizationId: orgId })
      .populate('candidateId', 'firstName lastName email stage')
      .populate('jobId', 'title code')
      .sort({ scheduledDate: 1 });

    res.status(200).json({ success: true, data: interviews });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const scheduleInterview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const orgId = req.user?.organizationId;
    const { candidateId, jobId, title, type, scheduledDate, startTime, endTime, meetingLink, location } = req.body;

    if (!candidateId || !jobId || !title || !scheduledDate || !startTime || !endTime) {
      res.status(400).json({ success: false, message: 'Candidate, job, title, date, and times are required' });
      return;
    }

    const interview = new Interview({
      organizationId: orgId,
      candidateId,
      jobId,
      title,
      type: type || 'video',
      scheduledDate: new Date(scheduledDate),
      startTime,
      endTime,
      meetingLink: meetingLink || 'https://meet.sparkx.io/interview-' + Math.random().toString(36).substring(7),
      location: location || 'Virtual Video Call',
      status: 'scheduled'
    });

    await interview.save();

    // Advance candidate to 'interview' stage if still in screening/applied
    const candidate = await Candidate.findById(candidateId);
    if (candidate && (candidate.stage === 'applied' || candidate.stage === 'screening')) {
      candidate.stage = 'interview';
      await candidate.save();
    }

    res.status(201).json({ success: true, data: interview });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
