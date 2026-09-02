---
title: Ansible的重启容器化执行
author: Comardom
description: 基于Podman的Ansible操作。
pubDate: 2026-04-01
draft: false
---
## EE的实验性配置
#### 安装EE
Ansible使用称为执行环境(EE)的容器镜像作为控制节点，旨在解决复杂性问题，并提供容器化的优势。
```bash
yay -S ansible-navigator ansible-builder
pip3 install ansible-navigator ansible-builder
```
验证EE环境。
```bash
ansible-navigator --version
ansible-builder --version
```
#### 自定义EE的创建与排错
创建EE文件夹，并且创建依赖文件。
```bash
cd /home/comardom/AnsibleProjects/
mkdir serverManagerEE
cd serverManagerEE
vim execution-environment.yaml
```
把.yamllint复制到这个文件夹下。
```bash
cp ~/AnsibleProjects/serverManagerWithoutEE/.yamllint \
~/AnsibleProjects/serverManagerEE/.yamllint
```
##### EE镜像的样板文件
编辑execution-environment.yaml，填入以下内容。
```yaml
---
# 这个类似于HTML5，是配置文件的版本号
version: 3
# 这是容器的底层系统，不是服务器也不是客户机而是容器
images:
  base_image:
    name: quay.io/fedora/fedora:39
# 依赖项
dependencies:
  # 这是pip相关的核心
  ansible_core:
    package_pip: ansible-core
  # 它是EE能在各种平台上被调用的关键接口
  ansible_runner:
    package_pip: ansible-runner
  # 操作系统级别的依赖
  system:
    # 让容器具备ssh命令
    - openssh-clients
    # 不用私钥而是用密码登录时使用
    - sshpass
  # 扩展包
  galaxy:
    collections:
      - name: community.postgresql

```
这个配置文件是一张图纸，用于构建自己的EE。EE依赖于podman或者docker，所以需要自行安装podman或docker，这里推荐podman，后续以podman为例。
```bash
sudo pacman -S podman
```
如果安装的是docker，由于EE优先寻找podman，请在构建命令后加参数`--container-runtime docker`。
开始构建。注意使用builder进行构建时需要打开VPN的TUN模式，因为容器需要从quay.io上下载Fedora的镜像。第一次构建时间很长，可能需要5～10分钟。
```bash
ansible-builder build --tag postgresql_ee
```
此时观察文件结构，可以观察到context文件夹内部包含_build文件夹和Containerfile。如果使用Docker,此处应为Dockerfile。
```bash
cd context/
ls
```
然后使用podman或者docker的工具查看新构建的EE镜像信息。
```bash
podman images | grep postgresql_ee
docker images | grep postgresql_ee
```
退出context，返回到serverManagerEE文件夹，运行navigator进行检查。
```bash
cd ../
ansible-navigator
```
此时稍作等待，会进入一个TUI，也就是文本用户界面，可以在终端中与程序进行可视化交互。
此时先键入一个冒号，代表命令输入，不要回车，再键入images，回车，如下。
```bash
:images
```
此时可以在仪表盘中看见刚刚创建的镜像。如果需要查看更多信息或者操作这个镜像，观察终端窗口下方的操作提示，根据提示进行操作。
一路按ESC键退出TUI，检查文件结构，可能会发现出现了一个log文件。
```bash
ls
```
打开这个文件看看。
```bash
cat ansible-navigator.log
```
此时应该会发现有关images的warning，是关于ghcr.io/ansible/community-ansible-dev-tools:latest的，一般是网络环境导致无法下载；不过这并不影响通过execution-environment.yaml构建出来的镜像的使用。
##### Ansible最主要的配置文件
此时可以选择创建配置文件并限制下载行为。另外，需要在这里挂载你的私钥给EE，因为EE无法读取外界信息。
```bash
vim ansible-navigator.yaml
```
配置内容如下。此处设定了关于log和json结果文件的生成位置，防止对正常的文件结构造成干扰。
```yaml
---
ansible-navigator:

  # EE的设定
  execution-environment:
    container-engine: podman
    image: localhost/postgresql_ee:latest
    pull:
      policy: missing
    # 保持UID一致，解决Permission denied
    container-options:
      - "--userns=keep-id"
    # 把宿主机的SSH目录映射到容器里同样的位置
    volume-mounts:
      - src: "/home/comardom/.ssh"
        dest: "/home/comardom/.ssh"
        # 这是关于SELinux的，加入这一行提高可移植性
        options: "Z"
        
  # 设定日志相关
  logging:
    level: debug
    # 设定log文件的具体路径
    file: ./outputs/navigator.log
    
  # 设定输出json相关
  playbook-artifact:
    enable: true
    # 设定执行结果JSON的存放目录和命名格式
    # {playbook_name}会自动替换为test_remote这样的名字
    save-as: ./outputs/{playbook_name}-{time_stamp}.json

  # 类似ansible-playbook的实时输出
  ansible:
    inventory:
      entries:
        - ./inventory/hosts.yaml
```
如果log文件中只有关于community-ansible-dev-tools:latest的warning，可以先删除log，再次运行ansible-navigator查看是否仍然报错。
```bash
rm ansible-navigator.log
ansible-navigator
```
退出navigator后查看log文件内容，如果发现不输出关于community-ansible-dev-tools:latest的warning，则成功。
```bash
cat ansible-navigator.log
```

---

## EE镜像的打包
已经制作好EE镜像了以后，它通过podman或者docker挂载在本地，如果需要在不同的电脑上操作远端的服务器，那么就可以传播Containerfile或者离线镜像。
离线镜像使用podman的工具制作，此处将镜像打包成tar文件。
```bash
podman save -o my_postgresql_ee.tar localhost/postgresql_ee
```
在另外的电脑上导入podman离线镜像。
```bash
podman load -i my_postgresql_ee.tar
```

---

## 创建EE中的Playbook
在EE中创建Playbook并试运行。
#### 针对本地机器内EE容器的Playbook
首先先在本地进行测试。
```bash
vim test_localhost.yaml
```
填入本地测试的内容。
```yaml
---
- name: Gather and print local facts
  hosts: localhost
  become: true
  gather_facts: true
  tasks:
    - name: Print facts
      ansible.builtin.debug:
        var: ansible_facts
```
在自己的EE镜像中测试针对本地的playbook。此处--user=0指的是root用户，如果需要测试非root用户，则改为--user=1000。
创建测试脚本。
```bash
vim test_localhost.sh
```
填入bash脚本。
```sh
#!/bin/bash
cd "$(dirname "$0")" || { echo "cannot enter dir"; exit 1; }
ansible-navigator run test_localhost.yaml \
--execution-environment-image postgresql_ee \
--mode stdout \
--pull-policy missing \
--container-options='--user=0'
```
修改权限并运行测试。
```bash
chmod +x 'test_localhost.sh'
sh test_localhost.sh
```
收集的事实信息是关于容器的，而不是开发人员机器的。这是因为Ansible剧本是在容器内运行的。此处每运行一次命令会出现一条json。
#### 针对远程服务器的Playbook
然后在远端服务器进行测试。
```bash
mkdir inventory
cd inventory
```
##### hosts配置文件
新建hosts.yaml并填入连接远程服务器的信息。
```bash
vim hosts.yaml
```
注意此处的私钥文件位置必须是能暴露给容器的，容器的文件系统是独立的。
```yaml
---
all:
  hosts:
    server1:
      ansible_host: 112.126.87.83
    server2:
      ansible_host: 47.93.40.173
  vars:
    ansible_port: 2222
    ansible_user: adminAnsible
    ansible_ssh_private_key_file: /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem
    ansible_become: true
    ansible_become_method: sudo
    ansible_ssh_common_args: '-o StrictHostKeyChecking=no'
    ansible_python_interpreter: /usr/bin/python3
```
##### 连接hosts中的服务器
退回到EE的根目录并创建playbook。
```bash
cd ../
vim test_remote.yaml
```
内容如下。
```yaml
- name: Gather and print facts
  hosts: all
  become: true
  gather_facts: true
  tasks:
   - name: Print facts
     ansible.builtin.debug:
       var: ansible_facts
```
在自己的EE镜像中测试针对远程服务器的playbook。
创建测试脚本。
```bash
vim test_remote.sh
```
填入bash脚本。
```sh
#!/bin/bash
cd "$(dirname "$0")" || { echo "cannot enter dir"; exit 1; }
ansible-navigator run test_remote.yaml --mode stdout
```
修改权限并运行测试。
```bash
chmod +x 'test_remote.sh'
sh test_remote.sh
```