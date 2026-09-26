import { randomUUID } from 'node:crypto'
import { ORCHESTRATION_CONTRACT_VERSION } from '../../shared/protocol-version'
import type { RuntimeOrchestrationEnvelope } from '../../shared/runtime-rpc-envelope'

export function desktopPeerMailEnvelope(
  method: string,
  params: unknown
): RuntimeOrchestrationEnvelope | undefined {
  if (
    method !== 'orchestration.send' ||
    !params ||
    typeof params !== 'object' ||
    !('from' in params) ||
    params.from !== 'patch-bay' ||
    !('type' in params) ||
    params.type !== 'status'
  ) {
    return undefined
  }
  return {
    orchestrationContractVersion: ORCHESTRATION_CONTRACT_VERSION,
    orchestrationRequestId: randomUUID()
  }
}
