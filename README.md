Use this command to create a new secret with the seo-ve-credentials
`kubectl -n seo-ve-production create secret generic seo-ve-credentials --from-file=key.json=seo-ve-credentials.json`

Use this env variable to authenticate using the seo-ve-credentials.json file
`export GOOGLE_APPLICATION_CREDENTIALS=seo-ve-credentials.json`

Use this to start a bash job in an existing container
`kubectl -n seo-ve-production exec --stdin --tty k8-42mnx -- /bin/bash`



## TODO
- Try using the GKE service account to authenticate to Google (kc.loadFromCluster();):
https://stackoverflow.com/questions/64212837/how-can-i-load-configuration-for-kubernetes-using-kubernetes-client-google-clou