import { Directory, File, Paths } from 'expo-file-system';

const proofDirectory = new Directory(Paths.document, 'proof-images');

function getExtension(uri: string) {
  const cleanUri = uri.split('?')[0];
  const extension = cleanUri.includes('.') ? cleanUri.split('.').pop() : null;
  return extension ? `.${extension}` : '.jpg';
}

export async function persistProofImage(sourceUri: string, localUuid: string) {
  proofDirectory.create({ idempotent: true, intermediates: true });

  const sourceFile = new File(sourceUri);
  const destinationFile = new File(proofDirectory, `${localUuid}${getExtension(sourceUri)}`);
  sourceFile.copy(destinationFile);

  return destinationFile.uri;
}
