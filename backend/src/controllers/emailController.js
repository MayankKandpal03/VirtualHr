import { asyncWrap } from "../utils/appError.js";
import ApiResponse from "../utils/apiResponse.js";
import { sendBulkEmails } from "../services/emailService.js";

// body: { candidateIds: string[], subject: string, template: string }
// template supports {{name}}, {{jobTitle}}, {{score}} placeholders
export const sendBulkEmailsController = asyncWrap(async (req, res) => {
  const result = await sendBulkEmails(req.user.id, req.params.jobId, req.body);
  res.status(200).json(new ApiResponse(200, result, "Emails sent"));
});
