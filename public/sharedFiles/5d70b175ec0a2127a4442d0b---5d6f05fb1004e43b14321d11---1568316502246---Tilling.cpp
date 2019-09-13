#include<bits/stdc++.h>
using namespace std;

int main()
{
    int test;
    cin>>test;
    int n;
    long long int dp[40];
    dp[0] = 1;
    for(int i = 1; i <= 30; i++){
        dp[i] = dp[i-1]*3;
    }
    while(test--){
        cin>>n;
        cout<<dp[n]<<endl;
    }
    return 0;
}
