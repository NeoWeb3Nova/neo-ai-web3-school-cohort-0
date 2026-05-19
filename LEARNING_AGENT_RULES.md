# AI × Web3 School Learning Agent 规则速查

> 来源：https://aiweb3.school/learning-agent.zh.txt
> 作用：让 Agent 在每次会话中自动遵循这套工作流

## 固定入口

- Handbook：https://aiweb3.school/zh/handbook/
- WCB 课程：https://web3career.build/zh/programs/AI-Web3-School
- WCB Learning：https://web3career.build/zh/programs/AI-Web3-School#tab=learning
- WCB Agent API：https://web3career.build/llms.txt

## 每日工作流

1. 读 WCB Learning 页面，确认今日课程、任务、会议、打卡入口
2. 读 Handbook 相关章节，生成最小/推荐/挑战路径
3. 写 daily/YYYY-MM-DD.md
4. 生成打卡草稿
5. 返回打卡平台链接，学员手动提交
6. 学员提交后，把打卡链接回写到 daily note

## 安全原则

- public repo 不放 API key、助记词、私钥、个人信息
- secret 只放环境变量（如 WCB_AGENT_SECRET_API_KEY）
- 所有写入操作必须展示内容并取得确认

## 设计原则

- 轻量优先：先让今天能行动，不一次性规划所有未来
- 人工确认：涉及账号、repo、写文件、打卡、WCB 提交、secret 配置的步骤必须确认
- 开源沉淀：repo 是 proof-of-work workspace，不只是笔记
- 隐私安全：public repo 不放敏感信息
- 反馈闭环：学员问题要能回流到 handbook-feedback/
- 平台边界清晰：Agent 辅助生成和提醒，正式提交以 WCB / 打卡平台为准
