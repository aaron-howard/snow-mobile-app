import { database } from './database';
import type { BlueprintSkill } from './models/BlueprintSkill';
import type { Exam } from './models/Exam';
import type { Question } from './models/Question';
import type { TopicDomain } from './models/TopicDomain';

/**
 * Inserts two sample exams with domains, blueprint skills, and a handful of
 * published questions when the local DB is empty. Runs only in development
 * and never during Jest (`NODE_ENV === 'test'`).
 */
export async function seedDevCatalogIfEmpty(): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;

  const existing = await database.get<Exam>('exams').query().fetchCount();
  if (existing > 0) return;

  const now = Date.now();

  await database.write(async () => {
    const examsCollection = database.get<Exam>('exams');
    const domainsCollection = database.get<TopicDomain>('topic_domains');
    const skillsCollection = database.get<BlueprintSkill>('blueprint_skills');
    const questionsCollection = database.get<Question>('questions');

    const csa = await examsCollection.create((e) => {
      e.name = 'Certified System Administrator (CSA)';
      e.certificationLevel = 'Associate';
      e.estimatedStudyHours = 40;
      e.officialDurationMinutes = 90;
      e.officialQuestionCount = 60;
      e.officialPassingScore = 70;
      e.minimumQuestionCount = 60;
      e.contentVersion = 'dev-seed-1';
      e.isEnrolled = false;
      e.enrolledAt = null;
      e.contentDownloadedAt = null;
    });

    const cad = await examsCollection.create((e) => {
      e.name = 'Certified Application Developer (CAD)';
      e.certificationLevel = 'Associate';
      e.estimatedStudyHours = 35;
      e.officialDurationMinutes = 90;
      e.officialQuestionCount = 60;
      e.officialPassingScore = 70;
      e.minimumQuestionCount = 60;
      e.contentVersion = 'dev-seed-1';
      e.isEnrolled = false;
      e.enrolledAt = null;
      e.contentDownloadedAt = null;
    });

    const csaPlatform = await domainsCollection.create((d) => {
      d.examId = csa.id;
      d.name = 'Platform & architecture';
      d.weightPercent = 35;
    });
    const csaWorkflow = await domainsCollection.create((d) => {
      d.examId = csa.id;
      d.name = 'Workflow & automation';
      d.weightPercent = 30;
    });
    await domainsCollection.create((d) => {
      d.examId = csa.id;
      d.name = 'Security & access';
      d.weightPercent = 20;
    });

    await domainsCollection.create((d) => {
      d.examId = cad.id;
      d.name = 'Application design';
      d.weightPercent = 40;
    });
    await domainsCollection.create((d) => {
      d.examId = cad.id;
      d.name = 'Integration & testing';
      d.weightPercent = 35;
    });

    const skillP = await skillsCollection.create((s) => {
      s.examId = csa.id;
      s.domainId = csaPlatform.id;
      s.code = 'CSA-PLAT-001';
      s.description = 'Instance architecture (sample)';
      s.blueprintSourceUrl = 'https://example.com/blueprint/csa';
      s.blueprintRetrievedAt = now;
    });
    const skillW = await skillsCollection.create((s) => {
      s.examId = csa.id;
      s.domainId = csaWorkflow.id;
      s.code = 'CSA-WF-001';
      s.description = 'Business rules (sample)';
      s.blueprintSourceUrl = 'https://example.com/blueprint/csa';
      s.blueprintRetrievedAt = now;
    });

    await questionsCollection.create((q) => {
      q.examId = csa.id;
      q.domainId = csaPlatform.id;
      q.blueprintSkillId = skillP.id;
      q.text = 'What is the primary database behind the ServiceNow platform?';
      q.imageUrl = null;
      q.imageAltText = 'No diagram for this question.';
      q.explanation = 'ServiceNow stores transactional data in a relational database managed for each instance.';
      q.difficultyLevel = 'easy';
      q.bloomsLevel = 'remember';
      q.authorId = 'dev-seed';
      q.sourceNotes = '';
      q.reviewStatus = 'published';
      q.reviewedBy = null;
      q.reviewedAt = null;
      q.publishedAt = now;
      q.timesAnswered = 0;
      q.timesAnsweredCorrectly = 0;
      q.isPoolReset = false;
      q.createdAt = now;
      q.updatedAt = now;
    });

    await questionsCollection.create((q) => {
      q.examId = csa.id;
      q.domainId = csaWorkflow.id;
      q.blueprintSkillId = skillW.id;
      q.text = 'When should you prefer a Business Rule over a Script Include?';
      q.imageUrl = null;
      q.imageAltText = 'No diagram for this question.';
      q.explanation = 'Business rules run in response to database events on a table; Script Includes are reusable server-side modules.';
      q.difficultyLevel = 'medium';
      q.bloomsLevel = 'understand';
      q.authorId = 'dev-seed';
      q.sourceNotes = '';
      q.reviewStatus = 'published';
      q.reviewedBy = null;
      q.reviewedAt = null;
      q.publishedAt = now;
      q.timesAnswered = 0;
      q.timesAnsweredCorrectly = 0;
      q.isPoolReset = false;
      q.createdAt = now;
      q.updatedAt = now;
    });
  });
}
