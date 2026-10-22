/**
 * The email a submission becomes, and the two ways of sending it.
 *
 *   MAIL_TRANSPORT=console   prints the email; local development, no AWS.
 *   MAIL_TRANSPORT=ses       sends it through SES; Lambda only.
 *
 * Every email goes to one fixed recipient from a fixed, verified sender. The
 * visitor's address only ever appears in Reply-To, so the form cannot be
 * used to send mail to anyone else.
 */
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';

export interface Mail {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  text: string;
}

export type MailTransport = (mail: Mail) => Promise<void>;

export interface Visitor {
  name: string;
  email: string;
  message: string;
}

export function composeMail(
  visitor: Visitor,
  addresses: { from: string; to: string },
  receivedAt: Date,
): Mail {
  return {
    from: addresses.from,
    to: addresses.to,
    replyTo: visitor.email,
    // Validation has already refused control characters in the name, so it
    // cannot break out of the Subject header.
    subject: `Portfolio contact: ${visitor.name}`,
    text: [
      `From: ${visitor.name} <${visitor.email}>`,
      `Received: ${receivedAt.toISOString()}`,
      '',
      visitor.message,
      '',
      '--',
      'Sent from the contact form. Reply to answer the visitor directly.',
    ].join('\n'),
  };
}

/** Prints the email instead of sending it. Message bodies are fine here: local only. */
export function consoleTransport(write: (line: string) => void = console.log): MailTransport {
  return async (mail) => {
    write(
      [
        '--- email (MAIL_TRANSPORT=console, not sent) ---',
        `From: ${mail.from}`,
        `To: ${mail.to}`,
        `Reply-To: ${mail.replyTo}`,
        `Subject: ${mail.subject}`,
        '',
        mail.text,
        '--- end ---',
      ].join('\n'),
    );
  };
}

/** Structural type of the one SESv2Client method used, so tests can stand in. */
export interface SesClient {
  send(command: SendEmailCommand): Promise<unknown>;
}

export function sesTransport(client: SesClient = new SESv2Client({})): MailTransport {
  return async (mail) => {
    await client.send(
      new SendEmailCommand({
        FromEmailAddress: mail.from,
        Destination: { ToAddresses: [mail.to] },
        ReplyToAddresses: [mail.replyTo],
        Content: {
          Simple: {
            Subject: { Data: mail.subject, Charset: 'UTF-8' },
            Body: { Text: { Data: mail.text, Charset: 'UTF-8' } },
          },
        },
      }),
    );
  };
}

/**
 * The transport MAIL_TRANSPORT names. Console mode is refused inside Lambda:
 * it would write visitors' messages into CloudWatch Logs.
 */
export function createTransport(
  name: string | undefined,
  env: Record<string, string | undefined> = process.env,
): MailTransport {
  switch (name) {
    case 'ses':
      return sesTransport();
    case 'console':
      if (env.AWS_LAMBDA_FUNCTION_NAME) {
        throw new Error('MAIL_TRANSPORT=console is for local development only.');
      }
      return consoleTransport();
    default:
      throw new Error(`MAIL_TRANSPORT must be "console" or "ses", got ${JSON.stringify(name)}.`);
  }
}
