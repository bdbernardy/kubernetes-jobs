
// https://raw.githubusercontent.com/kubernetes/website/main/content/es/examples/controllers/job.yaml


// Check for how to authenticate
// https://github.com/googleapis/nodejs-cloud-container/issues/213
// https://cloud.google.com/kubernetes-engine/docs/tutorials/authenticating-to-cloud-platform
// https://ahmet.im/blog/authenticating-to-gke-without-gcloud/

const k8s = require('@kubernetes/client-node');
const container = require('@google-cloud/container');
const { GoogleAuth } = require('google-auth-library');

function authenticater(auth_token, caData) {
  return (opts) => {
    // this is forming the certificate-authority for the api server
    opts.ca = Buffer.from(caData, 'base64');
    if (!opts.headers) {
      opts.headers = [];
    }
    opts.headers.Authorization = 'Bearer ' + auth_token;
  }
}

async function run() {
  const gke_client = new container.v1.ClusterManagerClient();
  const [gke_cluster] = await gke_client.getCluster({
    projectId: "busbud-integrations",
    zone: "us-east4-a",
    clusterId: "busbud-us-east4-1"
  })

  // seo-ve@busbud-integrations.iam.gserviceaccount.com
  const cluster = {
    name: "my-cluster",
    caData: gke_cluster.masterAuth.clusterCaCertificate,
    server: `https://${gke_cluster.endpoint}`
  };

  const user = {
    name: 'mickey-mouse',
    authProvider: { name: "gcp" }
  };

  const context = {
    name: 'my-context',
    user: user.name,
    cluster: cluster.name,
  };

  const kc = new k8s.KubeConfig();
  kc.loadFromOptions({
    clusters: [cluster],
    users: [user],
    contexts: [context],
    currentContext: context.name,
  });

  const batchClient = kc.makeApiClient(k8s.BatchV1Api);

  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
  });
  const auth_token = await auth.getAccessToken();
  const caData = kc.clusters[0].caData;

  batchClient.setDefaultAuthentication({
    applyToRequest: authenticater(auth_token, caData)
  });

  // If the job already exists, we delete it.
  const jobs = await batchClient.listNamespacedJob('seo-ve-production');
  const existingJob = jobs.body.items.find(item => item?.metadata?.name === 'test');
  if (existingJob) {
    await batchClient.deleteNamespacedJob('test', 'seo-ve-production');
  }

  // TODO the above code doesn't work well. The delete promise is resolved before the job is deleted in k8.
  // We probably need to add some kind of polling mechanism.

  // Creating the new job
  const job = new k8s.V1Job();
  job.apiVersion = 'batch/v1';
  job.kind = 'Job';

  const metadata = new k8s.V1ObjectMeta();
  metadata.name = 'test';
  job.metadata = metadata;

  const jobSpec = new k8s.V1JobSpec();
  const podTemplate = new k8s.V1PodTemplateSpec();
  const podSpec = new k8s.V1PodSpec();
  const podContainer = new k8s.V1Container();
  podContainer.name = 'test';
  podContainer.image = 'bash';
  podContainer.command = ["pwd"];

  podSpec.containers = [podContainer];
  podSpec.restartPolicy = "Never";
  podTemplate.spec = podSpec;
  jobSpec.template = podTemplate;
  jobSpec.backoffLimit = 4;

  job.spec = jobSpec;

  await batchClient.createNamespacedJob('seo-ve-production', job);
}

run().catch(err => {
  console.log(err);
  throw err;
});