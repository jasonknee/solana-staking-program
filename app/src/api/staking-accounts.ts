import { post, get, patch } from "../utils/http.client"

const BASE_URL = "https://api.notsofungible.world/v1";
export const getStakingAccountsForChallengeByStatus = async (walletAccountId: string, challengeId: string, status: string) => {
  const url = `${BASE_URL}/wallet_accounts/${walletAccountId}/staking_accounts?challengeId=${challengeId}&status=${status}`
  const response = await get(url);
  return response?.payload;
}

export const saveStakingAccount = async (stakingAccount: any) => {
  console.log(stakingAccount);
  const url = `${BASE_URL}/wallet_accounts/${stakingAccount.walletAccountId}/staking_accounts`
  const response = await post(url, stakingAccount);
  console.log(response);
}

export const updateStakingAccount = async (walletAccountId: string, stakingAccountId: string, status: string) => {
  const body = { status };
  const url = `${BASE_URL}/wallet_accounts/${walletAccountId}/staking_accounts/${stakingAccountId}`
  const response = await patch(url, body);
  console.log(response);
  return response?.payload;
}