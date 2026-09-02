---
title: 从零开始使用Ansible部署服务器
author: Comardom
description: 从实际需求出发，为部署服务，从零开始使用Ansible管理服务器。
pubDate: 2026-07-24
draft: false
---
到服务器厂商控制台：网络与安全组里开启任意位置的2222端口（你喜欢的SSH端口）
登录到服务器。
```bash
ssh -i /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem root@112.126.87.83
ssh -i /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem root@47.93.40.173
```
更新系统。
```bash
sudo dnf update -y
sudo dnf install epel-release -y
sudo dnf install vim git zip unzip tar nginx -y
```
然后改ssh配置
```bash
sudo vim /etc/ssh/sshd_config
```
改成Port 2222，然后重启服务
```bash
systemctl restart sshd
```
本地跑一下清除指纹
```bash
ssh-keygen -R "[112.126.87.83]:2222"
ssh-keygen -R "[47.93.40.173]:2222"
```
重新登录
```bash
ssh -p 2222 -i /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem root@112.126.87.83
ssh -p 2222 -i /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem root@47.93.40.173
```
设置Ansible账户
```bash
#创建用户
sudo useradd -m -s /bin/bash adminAnsible
sudo passwd adminAnsible          # 必须先设密码
#加入sudo
sudo usermod -aG wheel adminAnsible
#这条命令可以检查sudo权限
getent group wheel
#----------------------------------------------------------
#进入adminAnsible进行设置
su - adminAnsible
#创建文件夹
mkdir -p ~/.ssh
#创建文件
touch ~/.ssh/authorized_keys
exit
#----------------------------------------------------------
#复制之前在服务商控制台那里创建的公钥文件到不同用户的固定文件
sudo cp /root/.ssh/authorized_keys /home/adminAnsible/.ssh/authorized_keys
sudo chown adminAnsible:adminAnsible /home/adminAnsible/.ssh/authorized_keys
#----------------------------------------------------------
#进入adminAnsible确保文件权限正确
su - adminAnsible
#更改成ssh标准权限
chmod 700 ~/.ssh
#更改成ssh标准权限
chmod 600 ~/.ssh/authorized_keys
#可以检查文件权限
ls -ld /home/adminAnsible
ls -l ~/.ssh/authorized_keys
#如果发现不行的话，检查文件是否为空，如果发现是空的可以自己手动复制粘贴
#如果手动复制粘贴也不行，那就先用scp传到/tmp/里，再mv过去
cat ~/.ssh/authorized_keys
exit
#----------------------------------------------------------
#重启ssh服务确保运转正确
sudo systemctl restart sshd
```
如果加入的Ansible专用账户属于sudo组，那么它需要密码。为了跳过密码，要写入配置。
```bash
echo 'adminAnsible ALL=(ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/99-ansible
sudo chmod 440 /etc/sudoers.d/99-ansible
```
数字前缀控制优先级——99- 保证它最后读取，从而覆盖前面规则。
```bash
#创建用户
sudo useradd -m -s /bin/bash normalAnsible
sudo passwd normalAnsible          # 必须先设密码
sudo usermod -aG nginx normalAnsible
#----------------------------------------------------------
#进入adminAnsible进行设置
su - normalAnsible
#创建文件夹
mkdir -p ~/.ssh
#创建文件
touch ~/.ssh/authorized_keys
exit
#----------------------------------------------------------
#复制之前在服务商控制台那里创建的公钥文件到不同用户的固定文件
sudo cp /root/.ssh/authorized_keys /home/normalAnsible/.ssh/authorized_keys
sudo chown normalAnsible:normalAnsible /home/normalAnsible/.ssh/authorized_keys
#----------------------------------------------------------
#进入adminAnsible确保文件权限正确
su - normalAnsible
#更改成ssh标准权限
chmod 700 ~/.ssh
#更改成ssh标准权限
chmod 600 ~/.ssh/authorized_keys
#可以检查文件权限
ls -ld /home/normalAnsible
ls -l ~/.ssh/authorized_keys
#如果发现不行的话，检查文件是否为空，如果发现是空的可以自己手动复制粘贴
#如果手动复制粘贴也不行，那就先用scp传到/tmp/里，再mv过去
cat ~/.ssh/authorized_keys
exit
#----------------------------------------------------------
#重启ssh服务确保运转正确
sudo systemctl restart sshd
```
测试ansible账户登录
```bash
ssh -p 2222 -i /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem adminAnsible@112.126.87.83
ssh -p 2222 -i /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem adminAnsible@112.126.87.83 
```
找个文件夹/home/comardom/AnsibleProjects/alma/
```bash
vim .yamllint
```
写入内容
```plaintext
---
extends: default

rules:
  # 把行宽限制加大，或者直接禁用
  line-length:
    max: 160  # 建议设为 160，或者更宽
    allow-non-breakable-words: true
    allow-non-breakable-inline-mappings: true
```
服务器清单文件：
```bash
vim inventory.yaml
```
写入内容
```yaml
---
servers:
  hosts:
    flex-host:
      ansible_host: 112.126.87.83
    fixed-host:
      ansible_host: 47.93.40.173
  vars:
    # SSH端口
    ansible_port: 2222
    # 登录用户
    ansible_user: normalAnsible
    # 私钥文件
    ansible_ssh_private_key_file: /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem
    # 避免首次连接时因为 SSH 指纹检查导致失败，并且把复用时长缩短，socket 快速过期，防止冲突
    ansible_ssh_common_args: '-o StrictHostKeyChecking=accept-new -o ControlPersist=30s'
    # 设置超时
    ansible_connect_timeout: 10
    # 固定你的python路径，让程序不用自己找。这个是系统默认的路径
    # 但是如果以后你的Ansible显示python出了问题，要注意是不是这个路径有问题
    ansible_python_interpreter: /usr/bin/python3

```
检查是否出现问题
```bash
yamllint inventory.yaml
ansible-inventory -i inventory.yaml --list
ansible servers -m ping -i inventory.yaml
```
创建一个全局系统更新剧本
```bash
mkdir playbooks
cd playbooks/
vim playbook-update.yaml
```
填入内容
```yaml
---
- name: update
  hosts: servers
  become: true                  # 显式提权
  vars:
    ansible_user: adminAnsible  # 显式使用可提权账户
  tasks:
    - name: update all
      ansible.builtin.dnf:
        name: '*'
        state: latest
        update_cache: true

```
创建运行脚本
```bash
cd ../
vim run_update.sh
```
填入内容
```bash
#!/bin/bash
cd "$(dirname "$0")" || { echo "cannot enter dir"; exit 1; }
ansible-playbook -i inventory.yaml ./playbooks/playbook-update.yaml
```
尝试运行
```bash
chmod +x 'run_update.sh'
sh run_update.sh
```

跟之前一样的目录，或者自己组织，不多赘述
```bash
vim playbook-base.yaml
```
内容
```yaml
---
- name: base operation
  hosts: servers
  become: true
  vars:
    ansible_user: adminAnsible
  tasks:
    - name: set timezone
      ansible.builtin.timezone:
        name: Asia/Shanghai
    - name: install base software
      ansible.builtin.dnf:
        name: [vim, git, zip, unzip, tar, curl, nginx, fastfetch]
        state: present  # 确保这些已安装；再次运行不会重复安装，还有absent和latest的状态
    - name: auto secure update
      ansible.builtin.dnf:
        name: dnf-automatic
        state: present
    - name: systemd dnf-automatic timer ON
      ansible.builtin.systemd:
        name: dnf-automatic.timer
        enabled: true  # 开机自启
        state: started  # 现在立刻启动
```

此处开启SELinux
```bash
vim playbook-selinux's_install.yaml
```

```yaml
---
- name: selinux's install
  hosts: servers
  become: true
  vars:
    ansible_user: adminAnsible
    packages:
      - selinux-policy
      - selinux-policy-targeted
      - policycoreutils
      - policycoreutils-python-utils
      - audit
      - setools-console
  tasks:
    - name: selinux's install
      ansible.builtin.dnf:
        name: "{{ packages }}"
        state: present
```

先设置账户
```bash
#创建用户
sudo useradd -m -s /bin/bash adminMe
sudo passwd adminMe
#加入sudo
sudo usermod -aG wheel adminMe
#这条命令可以检查sudo权限
getent group wheel
#----------------------------------------------------------
#进入adminAnsible进行设置
su - adminMe
#创建文件夹
mkdir -p ~/.ssh
#创建文件
touch ~/.ssh/authorized_keys
exit
#----------------------------------------------------------
#复制之前在服务商控制台那里创建的公钥文件到不同用户的固定文件
sudo cp /root/.ssh/authorized_keys /home/adminMe/.ssh/authorized_keys
sudo chown adminMe:adminMe /home/adminMe/.ssh/authorized_keys
#----------------------------------------------------------
#进入adminAnsible确保文件权限正确
su - adminMe
#更改成ssh标准权限
chmod 700 ~/.ssh
#更改成ssh标准权限
chmod 600 ~/.ssh/authorized_keys
#可以检查文件权限
ls -ld /home/adminMe
ls -l ~/.ssh/authorized_keys
#如果发现不行的话，检查文件是否为空，如果发现是空的可以自己手动复制粘贴
#如果手动复制粘贴也不行，那就先用scp传到/tmp/里，再mv过去
cat ~/.ssh/authorized_keys
exit
#----------------------------------------------------------
#重启ssh服务确保运转正确
sudo systemctl restart sshd
```

```bash
#创建用户
sudo useradd -m -s /bin/bash normalMe
sudo passwd normalMe
sudo usermod -aG nginx normalAnsible
#----------------------------------------------------------
#进入adminAnsible进行设置
su - normalMe
#创建文件夹
mkdir -p ~/.ssh
#创建文件
touch ~/.ssh/authorized_keys
exit
#----------------------------------------------------------
#复制之前在服务商控制台那里创建的公钥文件到不同用户的固定文件
sudo cp /root/.ssh/authorized_keys /home/normalMe/.ssh/authorized_keys
sudo chown normalMe:normalMe /home/normalMe/.ssh/authorized_keys
#----------------------------------------------------------
#进入adminAnsible确保文件权限正确
su - normalMe
#更改成ssh标准权限
chmod 700 ~/.ssh
#更改成ssh标准权限
chmod 600 ~/.ssh/authorized_keys
#可以检查文件权限
ls -ld /home/normalMe
ls -l ~/.ssh/authorized_keys
#如果发现不行的话，检查文件是否为空，如果发现是空的可以自己手动复制粘贴
#如果手动复制粘贴也不行，那就先用scp传到/tmp/里，再mv过去
cat ~/.ssh/authorized_keys
exit
#----------------------------------------------------------
#重启ssh服务确保运转正确
sudo systemctl restart sshd
```

登入adminMe。
```bash
ssh -p 2222 -i /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem adminMe@112.126.87.83
ssh -p 2222 -i /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem adminMe@47.93.40.173
```
检查参数。
```bash
sudo grubby --info=ALL | grep -E "^index|selinux"
```
此时输出内容中含有selinux=0。
处理内核参数。
```bash
sudo grubby --update-kernel ALL --remove-args selinux
```
检查参数。
```bash
sudo grubby --info=ALL | grep -E "^index|selinux"
```
此时输出内容中==不==含有selinux=0。
修改SELinux到permissive。
```bash
sudo vim /etc/selinux/config
```
找到 SELINUX=disabled 一行，改成：
SELINUX=permissive
验证改动生效：
```bash
grep '^SELINUX=' /etc/selinux/config 
```
创建一个隐藏文件并且检查是否存在。这一步非常重要！没有这个文件会导致无法启动系统。
```bash
sudo touch /.autorelabel
ls -la /.autorelabel
```
重启系统。
```bash
sudo reboot
```
等待几分钟后重新登入adminMe。
```bash
ssh -p 2222 -i /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem adminMe@112.126.87.83
ssh -p 2222 -i /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem adminMe@47.93.40.173
```
检查系统状态：
```bash
getenforce                      # 期望 Permissive
sestatus                        # 完整状态（SELinux status: enabled, Current mode: permissive）
sudo ss -tlnp | grep sshd            # 期望 0.0.0.0:2222 还在监听
```
给端口打标签：
```bash
sudo semanage port -a -t ssh_port_t -p tcp 2222
sudo semanage port -l | grep ssh_port_t
```
确认成功以后到服务器厂商控制台：网络与安全组里关闭22的开放。
再次检查没有新增SSH 2222端口的错误。
```bash
sudo ausearch -m AVC -ts recent | tail -5
```

现在开始创建上传网页源文件的playbook。
在此之前，要先在inventory.yaml中加入要部署的网页内容。
```bash
cd /home/comardom/AnsibleProjects/alma/
vim inventory.yaml
```
在对应的服务器下添加变量，包括项目名称、dist文件夹的打包内容（不含dist外层文件夹）、cloudflare的SSL证书和私钥的地址前缀。
```yaml
......

servers:
  hosts:
    flex-host:
      ansible_host: 112.126.87.83
    fixed-host:
      ansible_host: 47.93.40.173
      sites:
        - name: in-principio-mundi
          domain: comardom.top
          src: /home/comardom/deploy_packages/in-principio-mundi.tar.gz
          cert_base: /home/comardom/.ssh/comardom.top/cloudflare/comardom.top
        - name: tasKapsulePage
          domain: taskapsule.xyz
          src: /home/comardom/deploy_packages/tasKapsulePage.tar.gz
          cert_base: /home/comardom/.ssh/tasKapsule.xyz/cloudflare/taskapsule.xyz
          
......
```

```bash
cd /home/comardom/AnsibleProjects/alma/playbooks/
sudo mkdir manage_webpage/
cd manage_webpage/
```
我们需要先初始化nginx。
```bash
vim playbook-init_nginx.yaml
```

```yaml
---
- name: init nginx
  hosts: servers
  become: true
  vars:
    ansible_user: adminAnsible
  tasks:
    - name: ensure nginx installed
      ansible.builtin.dnf:
        name: nginx
        state: present
    - name: ensure nginx ok
      ansible.builtin.systemd:
        name: nginx
        enabled: true
        state: started
```

然后是搬运文件。
```bash
vim playbook-mkdir_and_chmod.yaml
```

```yaml
---
- name: mkdir and chmod
  hosts: fixed-host
  become: true
  vars:
    ansible_user: adminAnsible
  tasks:
    - name: ensure normalMe in nginx
      ansible.builtin.user:
        name: normalMe
        groups: nginx
        append: true
    - name: mkdir and setgid
      ansible.builtin.file:
        path: "/var/www/{{ item.name }}"
        state: directory
        owner: normalMe
        group: nginx
        mode: '2775'  # 2=setgid，775
      loop: "{{ sites }}"
    - name: upload and unzip
      ansible.builtin.unarchive:
        src: "{{ item.src }}"
        dest: "/var/www/{{ item.name }}"
        owner: normalMe
        group: nginx
      loop: "{{ sites }}"
    - name: standardize file permissions
      ansible.builtin.file:
        path: "/var/www/{{ item.name }}"
        state: directory
        owner: normalMe
        group: nginx
        mode: u=rwX,g=rwXs,o=rX  # 组写 + setgid(s) 保留 + 执行位按需
        recurse: true
      loop: "{{ sites }}"
    - name: restore selinux context for web files
      ansible.builtin.command:
        restorecon -Rv /var/www/
      changed_when: false
```
然后是HTTPS的处理和nginx。
先创建模板文件。
```bash
mkdir templates/
cd templates/
vim nginx-ssg.conf.j2
```

```NGINX
# HTTP 重定向到 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name {{ item.domain }};

    return 301 https://$host$request_uri;
}

# HTTPS 配置
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name {{ item.domain }};

    root /var/www/{{ item.name }};
    index index.html index.htm;

    ssl_certificate     /etc/nginx/ssl/{{ item.domain }}.pem;
    ssl_certificate_key /etc/nginx/ssl/{{ item.domain }}.key;

    ssl_session_timeout 1d;
    ssl_session_cache shared:MozSSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|webp|svg|woff2)$ {
        expires 30d;
        log_not_found off;
    }
}
```

```bash
cd ../
vim playbook-https_and_nginx_conf.yaml
```

```yaml
---
- name: deploy https and nginx conf
  hosts: fixed-host
  become: true
  vars:
    ansible_user: adminAnsible
  tasks:
    - name: ensure ssl dir
      ansible.builtin.file:
        path: /etc/nginx/ssl
        state: directory
        mode: '0700'
    - name: upload cloudflare pem
      ansible.builtin.copy:
        src: "{{ item.cert_base }}.pem"
        dest: "/etc/nginx/ssl/{{ item.domain }}.pem"
        mode: '0600'
      loop: "{{ sites }}"
      notify: restart nginx
    - name: upload cloudflare key
      ansible.builtin.copy:
        src: "{{ item.cert_base }}.key"
        dest: "/etc/nginx/ssl/{{ item.domain }}.key"
        mode: '0600'
      loop: "{{ sites }}"
      notify: restart nginx
    - name: white nginx conf
      ansible.builtin.template:
        src: templates/nginx-ssg.conf.j2
        dest: "/etc/nginx/conf.d/{{ item.domain }}.conf"
      loop: "{{ sites }}"
      notify: restart nginx
    - name: nginx -t
      ansible.builtin.command: nginx -t
      changed_when: false
  handlers:
    - name: restart nginx
      ansible.builtin.systemd:
        name: nginx
        state: reloaded
```
然后就可以执行了。
创建一个通用启动脚本。
```bash
cd /home/comardom/AnsibleProjects/alma/
vim run.sh
```

```bash
#!/bin/bash
cd "$(dirname "$0")" || { echo "cannot enter dir"; exit 1; }

# 用法：sh run.sh <playbook文件名>，如 sh run.sh playbook-sshd.yaml
if [ -z "$1" ]; then
    echo "用法: sh run.sh <playbook文件名>"
    exit 1
fi

case "$1" in
    playbooks/*)  playbook="$1" ;;
    */*)          playbook="playbooks/$1" ;;
    *)            playbook="playbooks/$1" ;;
esac

if [ ! -f "$playbook" ]; then
    echo "文件不存在: $playbook"
    exit 1
fi

yamllint "$playbook" || { echo "yamllint 未通过"; exit 1; }
ansible-playbook -i inventory.yaml "$playbook"
```
然后就可以运行所有playbook了。
```bash
cd ~/AnsibleProjects/alma
sh run.sh playbook-update_all.yaml
sh run.sh playbook-base.yaml
sh run.sh playbook-install_selinux.yaml
sh run.sh playbook-int_sshd.yaml
sh run.sh manage_webpage/playbook-init_nginx.yaml
sh run.sh manage_webpage/playbook-mkdir_and_chmod.yaml
sh run.sh manage_webpage/playbook-https_and_nginx_conf.yaml
```
此时SSG网页应该已经部署完毕。
然后检查SELinux状态。
```bash
ssh -p 2222 -i /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem adminMe@47.93.40.173
sudo ausearch -m AVC -ts recent
```
此时应该会看到包含类似内容的描述：
```plaintext
denied  { getattr } for  pid=60876 comm="ngi  
nx" path="/var/www/in-principio-mundi/index.html" dev="vda3" ino=117499085 scontext=system_u:  
system_r:httpd_t:s0 tcontext=unconfined_u:object_r:var_t:s0 tclass=file permissive=1
```
这时候可以打标签：
```bash
sudo restorecon -Rv /var/www/
```
然后检查是否成功，访问过一次以后如果没有新的警告就是没问题。
```bash
ls -Z /var/www/in-principio-mundi/index.html
curl -I http://127.0.0.1/ -H "Host: comardom.top"
sudo ausearch -m AVC -ts recent | tail -5
```
此时确认无误可以开启SELinux的enforcing模式。
```bash
sudo sed -i 's/^SELINUX=.*/SELINUX=enforcing/' /etc/seli  
nux/config
grep '^SELINUX=' /etc/selinux/config
sudo reboot
```
等待一分钟后，重新登录查看。
 ```bash
 ssh -p 2222 -i /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem adminMe@47.93.40.173
 getenforce
 sudo ausearch -m AVC -ts recent
 ```
 如果输出Enforcing和\<no matches\>，就是顺利完全开启SELinux。
 接下来是审计系统。
 ```bash
 cd /home/comardom/AnsibleProjects/alma/playbooks/
 vim audit.rules
 ```
 
```rules
# ============================================
# 审计规则（Alma/RHEL 系 Web 服务器）
# 生效：augenrules --load
# ============================================

# ---------- 1. 全局设置 ----------
-b 8192               # 增大缓冲区防日志丢失
-f 1                  # 失败时打印警告，不 panic（保证可用性）

# ---------- 2. 监控 /var/www（Web 站点写操作） ----------
-w /var/www -p wa -k www_modified

# ---------- 3. 监控关键系统文件 ----------
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/group -p wa -k identity
-w /etc/gshadow -p wa -k identity
-w /etc/sudoers -p wa -k sudoers
-w /etc/sudoers.d/ -p wa -k sudoers
-w /etc/ssh/sshd_config -p wa -k sshd
-w /etc/ssh/ssh_config -p wa -k sshd
-w /etc/systemd/system/ -p wa -k systemd
-w /etc/crontab -p wa -k crontab
-w /etc/cron.d/ -p wa -k crontab
-w /etc/cron.daily/ -p wa -k crontab
-w /etc/cron.hourly/ -p wa -k crontab
-w /etc/cron.weekly/ -p wa -k crontab
-w /etc/cron.monthly/ -p wa -k crontab
-w /etc/hosts -p wa -k network
-w /etc/hostname -p wa -k network
-w /etc/resolv.conf -p wa -k network
-w /etc/selinux/config -p wa -k selinux

# ---------- 4. 高危命令执行（真实路径，非 /bin 链接） ----------
-a always,exit -F path=/usr/bin/rm -F perm=x -k cmd_rm
-a always,exit -F path=/usr/bin/rmdir -F perm=x -k cmd_rmdir
-a always,exit -F path=/usr/bin/chmod -F perm=x -k cmd_chmod
-a always,exit -F path=/usr/bin/chown -F perm=x -k cmd_chown
-a always,exit -F path=/usr/bin/chattr -F perm=x -k cmd_chattr
-a always,exit -F path=/usr/sbin/useradd -F perm=x -k cmd_useradd
-a always,exit -F path=/usr/sbin/usermod -F perm=x -k cmd_usermod
-a always,exit -F path=/usr/sbin/userdel -F perm=x -k cmd_userdel
-a always,exit -F path=/usr/bin/passwd -F perm=x -k cmd_passwd
-a always,exit -F path=/usr/bin/mount -F perm=x -k cmd_mount
-a always,exit -F path=/usr/bin/umount -F perm=x -k cmd_umount
-a always,exit -F path=/usr/sbin/shutdown -F perm=x -k cmd_shutdown
-a always,exit -F path=/usr/sbin/reboot -F perm=x -k cmd_reboot

# ---------- 5. 系统调用（提权 + root 外连） ----------
-a always,exit -F arch=b64 -S setuid,setgid -F auid>=1000 -F auid!=unset -k priv_esc
-a always,exit -F arch=b32 -S setuid,setgid -F auid>=1000 -F auid!=unset -k priv_esc
-a always,exit -F arch=b64 -S connect -F euid=0 -k network_connect_root
-a always,exit -F arch=b32 -S connect -F euid=0 -k network_connect_root
```

```bash
vim playbook-init_audit.yaml
```

```yaml
---
- name: init audit
  hosts: servers
  become: true
  vars:
    ansible_user: adminAnsible
  tasks:
    - name: ensure auditd ok
      ansible.builtin.systemd:
        name: auditd
        enabled: true
        state: started
    - name: write audit rules
      ansible.builtin.copy:
        src: audit.rules
        dest: /etc/audit/rules.d/ansible.rules
        mode: '0640'
    - name: load rules
      ansible.builtin.command:
        augenrules --load
      changed_when: false
    - name: verify rules loaded
      ansible.builtin.command:
        auditctl -l
      register: audit_rules
      changed_when: false
```

```bash
cd ~/AnsibleProjects/alma
sh run.sh playbook-init_audit.yaml
```