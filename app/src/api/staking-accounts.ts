import { post, get } from "../utils/http.client"

const BASE_URL = "http://localhost:4200";
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

