---
title: 登录到服务器-Debian
author: Comardom
description: 记录服务器的SSH基础流程。
pubDate: 2026-04-01
draft: false
---
# 登录与环境基础配置
## SSH
ssh在这里用于加密连接远端服务器，使用ssh的前提是服务器对你开放了特定端口和你有能进行ssh连接的设备。
### 连接软件
连接ssh的软件有很多，但我最推荐系统自带的bash及其类似物、fish、Powershell7等shell，毕竟减少无谓技术栈的堆叠是很可贵的。在终端中输入ssh测试你的终端是否支持ssh。
什么你说什么是终端？右键开始菜单，你或许可以看到"终端"和"终端管理员"。Windows Terminal是什么？Windows 11和Windows 10 22H2及以后自带这玩意，Windows 10可以在微软应用商店下载。
但是如果你和我一样特别喜欢Windows 8.1，那么你需要去Github下载：https://github.com/microsoft/terminal/releases。
更多信息可以看看微软官方的帮助文档https://learn.microsoft.com/zh-cn/windows/terminal/install。
### 端口问题
一般默认的ssh端口是22，全世界都这样，而管理和控制服务器恰好需要通过ssh，这意味着很多人会大批量地扫描各种ip的22端口进行爆破，尽管你换成别的端口也是这样，但是起码比22要好一些，至少可以减少噪声扫描，让你的日志减少一些爆破记录。
在这里我换成2222进行ssh连接。2222比较低，未来也许会和某些服务冲突，使用高位端口比如62546也许更好，但是2222好记方便，未来也可以再改。
接下来的步骤有一些是部署系统环境需要用的，本来不应该放在端口这里来说，但是由于打开系统以后，更改端口的优先级并不排在第一位，所以要有一些额外的操作。

登录用户不止有root，接下来会介绍添加用户，但是最开始是要使用root来进行下一步操作的，毕竟一开始只开放了root用户。如果你使用的不是root，就登录那个你设定的管理员账户，后面的步骤是基本一致的。
后面放进远程终端执行的命令，会使用[local]、[root]、[admin]、[normal]分别代表本地机器、服务器上的root用户、服务器上的可提权用户、服务器上的普通用户。默认按照最低权限要求使用用户。

步骤如下：
1. 在云服务商控制台的网络与安全组中添加入方向安全组规则，访问来源选择为0.0.0.0/0，除非你采用这些或类似的方式登录：
   * VPN内网登录、内网穿透登录
   * Port Knocking登录、动态防火墙登录
   * 2FA认证登录
2. 在终端中使用ssh登录。对于服务器管理的一般情况，ssh你只需要知道两个语法：ssh -i和ssh -p，也就是列出来的三种写法。

   ```bash
   # [local]
   ssh -i [你的私钥位置] [你要登录的用户名字]@[IPv4地址]
   ssh -p [你需要进入的端口号] [你要登录的用户名字]@[IPv4地址]
   ssh -p [你需要进入的端口号] -i [你的私钥位置] [你要登录的用户名字]@[IPv4地址]
   ```
   举个例子：`ssh -p 12345 -i ~/x/x.pem root@122.125.27.84`
   注意，使用ssh命令不加-p参数的时候，默认使用端口22登录，也就是说
   ```bash
   ssh -p 22 a@1.1.1.1
   ```
   和
   ```bash
   ssh a@1.1.1.1
   ```
   是等价的。
3. 系统升级。此处以Debian作为例子。建议每周都执行一次，检查有没有需要更新的东西。你需要执行这些步骤：

   ```bash
   # [root]

   sudo apt update                   # 检查更新
   sudo apt list --upgradable        # 列出更新项目
   sudo apt upgrade                  # 按需升级
   sudo apt autoremove -y            # 清理无用包
   sudo apt autoclean                # 清理缓存
   ```

4. 安装必须要用到的软件

   ```bash
   # [root]
   sudo apt install vim git zip unzip tar
   ```

5. 更改系统配置。

   ```bash
   # [root]
   sudo vim /etc/ssh/sshd_config
   ```

   找到其中一行"Port 22"
   替换"22"成"2222"或者你想要定义的
   ssh -p -i登录一下自定义端口试试
   如果不成功，重复以上步骤并检查，并在确定自定义端口ssh运行正常的情况下关闭22端口
### 初始化
这里的初始化指的是服务器运维的基础配置和一次性操作，接着刚才的自定义端口登录进行下去。
6. 准备新的用户组和用户

   ```bash
   # [root]
   sudo groupadd no_sudo               # 创建用户组
   sudo adduser normalMe               # 创建用户
   ```

   adduser的时候会让你输入密码和其他信息，密码要写的很复杂，大小写、数字和符号都用上，不要觉得麻烦，以后还是用密钥对登录的，复杂密码不需要手动输入。虽然后面会取消掉密码登录的功能，但是做好万全的准备是好的，一切为了安全。其他信息填不填都行，毕竟不是在公司，直接回车即可。不过如果你的团队已经出现了依靠个人权威无法管理的状态，这个user信息好好填也未尝不可。
   root用户是用于系统级维护的，一开始登录服务器是要用到的，后面就会禁用。创建用户组是为了便于统一管理，方便检查权限。no_sudo的创建不是必要的，也不是非得起这个名字，只是这样“看起来比较规整”。用户名也是一个道理，按照自己喜好来。
   这里我起名normalMe代表普通用户，可以改成别的。

   ```bash
   # [root]
   sudo usermod -aG no_sudo normalMe   # 用户加入用户组
   ```

   ```bash
   # [root]
   sudo adduser adminMe                # 创建用户
   ```

   同理adminMe可以改成别的，后文也使用adminMe代表有提权能力的用户
   这里加入sudo用户组是必要的，sudo用户组是系统提供的，su意味着super user。

   ```bash
   # [root]
   sudo usermod -aG sudo adminMe       # 用户加入用户组
   ```

   **— loop_start —** 
   创建好用户组和用户以后，进入各个用户进行基础操作：

   ```bash
   # [root]
   su - adminMe                        # 进入其他用户
   ```

   此时可以观察到终端提示从root@xxx:~#变成了adminMe@xxx:~#
   进行接下来的步骤：

   ```bash
   # [admin]
   mkdir -p ~/.ssh                     # 创建文件夹
   chmod 700 ~/.ssh                    # 更改成ssh标准权限
   vim ~/.ssh/authorized_keys          # 用编辑器创建文件并直接保存并退出
   chmod 600 ~/.ssh/authorized_keys    # 更改成ssh标准权限
   exit                                # 返回到root用户
   ```

   复制之前在服务商控制台那里创建的公钥文件到不同用户的固定文件。
   这里为了方便，仅仅用一份密钥对来登录三个账户，这并不是推荐的方法。如果服务器生产环境有多人参与，更推荐的办法是让不同的人自己在本地生成密钥对，并且向管理员提供不同的公钥，自己保管私钥，由管理员在root或者可提权的账户下登录他人的账户，按照用户组那里的loop内步骤操作。文件权限的问题一定要注意，要在本账户环境（su - [账户名]）下改成600才能正常使用。

   ```bash
   # [root]
   sudo cp /root/.ssh/authorized_keys /home/adminMe/.ssh/authorized_keys
   ```
   
   **— goto loop_start —**
   normalMe用户也进行上述操作，仅仅是改变名字。
   此时可以在终端新建标签页并测试是否可以登录，不要使用密码登录，如果不能登录则从以下几个角度排查问题：
     * 是在root中进入其他用户后操作的权限吗？
     * 权限保证正确吗？
     * 创建新文件了吗？
     * 两个新建的用户都执行了吗？
     * 是在退出新建的用户回到root之后做的拷贝操作吗？
7. 关闭root用户的ssh登录权限
   退出root用户
   登入可提权的用户adminMe

   ```bash
   # [admin]
   sudo vim /etc/ssh/sshd_config       # 编辑ssh配置
   ```

   找到其中一行"#PermitRootLogin prohibit-password"
   在下方加入一行"PermitRootLogin no"
   寻找文件末尾有没有未注释的"PermitRootLogin yes"
   如果有就注释掉
   重启ssh服务（在一部分情况下）

   ```bash
   # [admin]
   sudo systemctl restart ssh           # 重启服务确保配置生效
   ```

   检查root用户能否登录，如果不能则成功
8. 关闭其他所有用户的密码登入权限
   退出普通用户normalMe的ssh连接

   ```bash
   # [admin]
   sudo vim /etc/ssh/sshd_config       # 编辑和刚才一样的文件
   ```

   确认文件中==不存在=="PubkeyAuthentication ==no=="，保证能够通过密钥对登录
   在文件末尾检查有没有"PasswordAuthentication"字段，保证其值为no，保证不能通过密码登录
   同理加入这两行（关闭交互式质询认证，开启PAM认证）：
     * ChallengeResponseAuthentication ==no==
     * UsePAM ==yes==
   重启ssh服务（在一部分情况下）

   ```bash
   # [admin]
   sudo systemctl restart ssh           # 一样的重启
   ```

   检查能否使用密码登录普通用户，如果不能则成功
9. 配置全自动安全更新初始化
   ```bash
   # [admin]
   sudo apt install unattended-upgrades apt-listchanges
   sudo dpkg-reconfigure -plow unattended-upgrades   # 并选择yes
   ```
   sudo dpkg-reconfigure -plow unattended-upgrades这条命令，默认情况下，是几乎单纯的安全更新。这代表着一些非安全更新的bug修复被略过，但也代表着环境的相对不变。如果你觉得你的环境不需要长期固定在某个小版本而无法兼容下一个小版本（使用了某些很特殊的只能在某个特定环境下才能使用的模块什么的），那么可以按照这样操作：
    ```bash
    # [admin]
    sudo vim /etc/apt/apt.conf.d/50unattended-upgrades
    ```
    找到类似这一段的内容：
    ```plaintext
    Unattended-Upgrade::Origins-Pattern {
    "origin=Debian,codename=${distro_codename},label=Debian-Security";    // 默认开启：安全更新
    // "origin=Debian,codename=${distro_codename}-updates";    // 默认关闭：常规更新
    // "origin=Debian,codename=${distro_codename},label=Debian";    // 默认关闭：稳定版更新
    ...
    };
    ```
    先检查含有"Security"字样的行是否开启（未被注释），如果被注释掉就取消注释
    找到"-updates"字样的行，取消注释并保存文件 
10. 为部署网页做准备
   面向SSG架构的Vue，需要Nginx，SSG架构的Astro与其他框架或者原生页面同理，这里不使用Docker是因为SSG架构的前端界面不需要Docker或者Podman。但是复杂的前后端数据库混杂的环境就比较需要Docker或Podman了，如果感兴趣可以在编写部署后端的时候学习使用。

   ```bash
   # [admin]
   sudo apt install nginx               # 安装展示网页用的软件
   sudo systemctl start nginx           # 启动服务
   sudo systemctl enable nginx          # 开机自启
   sudo mkdir -p /var/www/[项目名称]     # 创建项目文件夹
   ```

   然后很重要的一步是修改权限，以后使用normalMe来管理项目文件

   ```bash
   # [admin]
   sudo chown -R www-data:www-data /var/www/[项目名称]
   sudo usermod -aG www-data normalMe     # 保证normalMe权限
   sudo chmod -R g+w /var/www/[项目名称]   # 写权限
   sudo chmod g+s /var/www/[项目名称]      # 组继承
   ```

   打开另一个终端标签页
   找到你本地build好的dist目录或者原生网页目录

   ```bash
   # [local]
   cd [dist目录]
   scp -P 2222 -i [私钥路径] -r ./dist/* normalMe@[IPv4]:/var/www/[项目名称]/
   ```

   这里是在复制文件，-P代表指定端口，2222可以替换成你之前设置好的端口，-i是代表使用密钥对登录，-r代表的是递归传输，意味着文件夹下的文件夹也能被传输，./dist/\*不用更改，除非你不在dist文件夹内，其实就是你的build好的静态文件夹下所有文件，\*是通配符的意思，代表不作任何限制，所有文件都上传。
   使用这两条命令，可以实时更新SSG网页，不需要其他命令。
11. 配置HTTPS
   进入Clouflare官网，注册登录账号。
   根据引导添加域名，选择免费方案，然后打开云服务商的控制台，添加cloudflare提供的解析，不同云服务商提供的控制台样貌不一，可以尝试搜索"解析记录"等的字样。
   可以将获取的私钥命名为域名.key，证书命名为域名.pem。

   ```bash
   # [admin]
   sudo mkdir -p /etc/nginx/ssl        # 创建https的证书文件夹
   sudo vim /etc/nginx/ssl/[域名].pem  # 创建证书文件
   ```

   填入证书内容并保存

   ```bash
   # [admin]
   sudo vim /etc/nginx/ssl/[域名].key  # 创建私钥文件
   ```

   填入私钥内容并保存

   ```bash
   # [admin]
   sudo chmod 600 /etc/nginx/ssl/[域名].key
   sudo vim /etc/nginx/sites-available/[项目名称].conf
   ```

   注意，保持很多重要文件的权限为600（仅本账户能读写）或者其他特定组合，系统才会正常运转。
   这个是你这个项目对应的nginx配置，填入以下内容：

   ```nginx
   # HTTP 重定向到 HTTPS
   server {
       listen 80;
       listen [::]:80;
       server_name [域名];

       return 301 https://$host$request_uri;
   }

   # HTTPS 配置
   server {
       listen 443 ssl;
       listen [::]:443 ssl;
       http2 on;
       server_name [域名];

       root /var/www/[项目文件夹名字];
       index index.html index.htm;

       # 证书路径
       ssl_certificate     /etc/nginx/ssl/[域名].pem;
       ssl_certificate_key /etc/nginx/ssl/[域名].key;

       # 推荐的 SSL 优化配置
       ssl_session_timeout 1d;
       ssl_session_cache shared:MozSSL:10m;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
       ssl_prefer_server_ciphers off;

       # 前端路由处理（SSG）
       location / {
           try_files $uri $uri/ =404;
       }

       # 静态资源缓存
       location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
           expires 30d;
           log_not_found off;
       }
   }
   ```

   ```bash
   # [admin]
   sudo ln -s /etc/nginx/sites-available/[项目名称].conf /etc/nginx/sites-enabled/           # 链接文件
   sudo nginx -t                    # 检查nginx语法
   sudo systemctl restart nginx     # 重启服务保证配置生效
   ```

   检查能否访问https的网页
12. SSR网页（全栈框架）/Node.js API（Express等）的后端部署
   推荐使用systemd或PM2，此处使用PM2

   ```bash
   # [admin]
   sudo npm install pm2@latest -g
   ```

   找到你的后端启动脚本（例如server.js或者index.mjs）并进行启动

   ```bash
   # [normal]
   pm2 start [脚本路径] --name "[项目名称]"
   pm2 startup                    # 开机自启
   ```

   此处会生成一串sudo开头的命令，复制并运行它

   ```bash
   # [normal]
   pm2 save                       # 保存自启动配置
   ```

   额外的pm2配置：

   ```bash
   # [normal]
   pm2 install pm2-logrotate      # 防止日志太多占满空间
   ```

   检查PM2启动的项目：

   ```bash
   # [normal]
   pm2 list                       # 检查应用列表
   pm2 stop <[id或名字]>           # 停止某应用
   pm2 restart <[id或名字]>        # 重启某应用
   pm2 delete <[id或名字]>         # 删除某应用
   pm2 describe <[id]>             # 查看某详细元数据
   pm2 monit                      # 仪表盘模式
   pm2 logs                       # 查看最新日志
   pm2 logs "[名字]"               # 查看特定日志
   ```