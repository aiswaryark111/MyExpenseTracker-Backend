import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({ region: process.env.AWS_REGION ?? 'eu-west-1' });

export async function loadSsmConfig(): Promise<void> {
  // Only load from SSM in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('Skipping SSM — using local .env');
    return;
  }

  console.log('Loading config from SSM Parameter Store...');

  try {
    let nextToken: string | undefined;

    do {
      const command = new GetParametersByPathCommand({
        Path: '/expenseiq/prod',
        WithDecryption: true,
        NextToken: nextToken,
      });

      const response = await ssm.send(command);

      // Inject each parameter into process.env
      for (const param of response.Parameters ?? []) {
        const key = param.Name!.split('/').pop()!; // e.g. DB_HOST
        process.env[key] = param.Value!;
        console.log(`Loaded: ${key}`);
      }

      nextToken = response.NextToken;
    } while (nextToken);

    console.log('SSM config loaded successfully ✅');
  } catch (error) {
    console.error('Failed to load SSM config:', error);
    throw error;
  }
}
