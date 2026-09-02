---
title: Ansible入门
author: Comardom
description: Ansible的基础操作。
pubDate: 2026-04-01
draft: false
---
## 前言
Ansible安装在控制节点（本地机器）上，被管理的服务器上不需要安装。控制节点通过SSH连接远程服务器。所以想使用Ansible需要先保证SSH能用。有疑问看[[登录到服务器（Debian）]]。同时贴出pacman/yay和pip3的意思是使用包管理器或者pip安装，而不是都运行一遍。
本文最后写于2026-07，Ansible core版本2.21.2，python版本3.14.3，测试系统Manjaro 7.1.4。

---

## 服务器的准备工作
#### 密钥对
准备好私钥，权限保证正确。然后准备好公钥，以备不时之需。
```bash
chmod 600 /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem
ssh-keygen -y -f /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem > /home/comardom/.ssh/comardom.top.taskapsule.xyz.pub
```
#### 为Ansible提供的服务器的ssh连接准备
在服务器中加入Ansible的sudo账户。以下命令请在==**服务器中运行**==。
```bash
# 进入服务器！！！所有的服务器都要这么设置哦
#创建用户
sudo adduser adminAnsible
#如果有统一sudo用户组的话，请加入，如果没有就不用管这一行
sudo usermod -aG with_sudo adminAnsible
#加入sudo
sudo usermod -aG sudo adminAnsible
#这条命令可以检查sudo权限
getent group sudo
#----------------------------------------------------------
#进入adminAnsible进行设置
su - adminAnsible
#创建文件夹
mkdir -p ~/.ssh
#用编辑器创建文件并直接保存并退出
vim ~/.ssh/authorized_keys
exit
#----------------------------------------------------------
#复制之前在服务商控制台那里创建的公钥文件到不同用户的固定文件
sudo cp /root/.ssh/authorized_keys /home/adminAnsible/.ssh/authorized_keys
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
sudo systemctl restart ssh
```
如果加入的Ansible专用账户属于sudo组，那么它需要密码。为了跳过密码，要先进入visudo。
```bash
#改变sudo配置，保证adminAnsible能无密码运行
sudo visudo
```
然后在文件末尾加入下面这一行，关闭并保存visudo配置的方法是先按Ctrl+X，然后点击Y，最后按Enter。
```plaintext
adminAnsible ALL=(ALL) NOPASSWD: ALL
```

---

## 本地机器的准备工作
#### 安装相关事宜
在用来连接ssh的电脑上安装Ansible，注意不是服务器上安装。
```bash
sudo pacman -S ansible
pip3 install ansible
```
然后检查安装。
```bash
ansible --version
```
注意，此处安装的是ansible而不是ansible-core，代表不仅安装了ansible-core，还安装了ansible-community等额外的collection。详细请见[在特定操作系统上安装 Ansible](https://docs.ansible.org.cn/ansible/latest/installation_guide/installation_distros.html)。
```bash
ansible-galaxy collection list   # 列出所有已安装的 Collections
```
#### 实验性项目初始化
创建项目文件夹，创建并打开配置文件inventory.yaml。
```bash
#这是项目文件的总文件夹
mkdir ~/AnsibleProjects/
cd ~/AnsibleProjects/
#这是这个项目的文件所在地
mkdir serverManagerWithoutEE/
cd serverManagerWithoutEE/
```
加入自己需要管理的IPv4和相关信息。
此处有两种配置文件写法，INI和YAML，推荐YAML，后续以YAML为例。
##### 关于yaml的细节
使用YAML之前，要了解到，使用yamllint检查yaml语法的正确性。
```bash
sudo pacman -S yamllint
pip3 install yamllint
```
yamllint默认最大宽度为80字符，所以要在目录内部写一个配置文件。
```bash
vim .yamllint
```
填入内容。
```yaml
---
extends: default

rules:
  # 把行宽限制加大，或者直接禁用
  line-length:
    max: 160  # 建议设为 160，或者更宽
    allow-non-breakable-words: true
    allow-non-breakable-inline-mappings: true
```
这是YAML。yaml文件可以使用等价的.yml和.yaml后缀，这里统一采用.yaml。
```bash
vim inventory.yaml
```
注意，YAML不可使用Tab缩进，仅可统一使用两个或者四个空格进行缩进；冒号后面必须跟一个空格；文件开头必须使用`---`代表文件起始；注释的`#`符号后面必须加一个空格；布尔值要写true或者false而不是yes和no。
```yaml
---
myhosts:
  hosts:
    server1:
      ansible_host: 112.126.87.83
    server2:
      ansible_host: 47.93.40.173
  vars:
    # SSH端口
    ansible_port: 2222
    # 登录用户
    ansible_user: adminAnsible
    # 私钥文件
    ansible_ssh_private_key_file: /home/comardom/.ssh/comardom.top.taskapsule.xyz.pem
    # 以下三条指的是设定sudo
    ansible_become: true
    ansible_become_method: sudo
    ansible_become_user: root
    # 避免首次连接时因为 SSH 指纹检查导致失败
    ansible_ssh_common_args: '-o StrictHostKeyChecking=no'
    # 固定你的python路径，让程序不用自己找。这个是系统默认的路径
    # 但是如果以后你的Ansible显示python出了问题，要注意是不是这个路径有问题
    ansible_python_interpreter: /usr/bin/python3
```
验证yaml语法正确性，验证清单正确性。
```bash
yamllint inventory.yaml
ansible-inventory -i inventory.yaml --list
ansible myhosts -m ping -i inventory.yaml
```
如果不同服务器的配置不一样，可以分开写var。这是一个yaml示例。
```yaml
---
myhosts:
  hosts:
    server1:
      ansible_host: 112.126.87.83
      ansible_port: 222
      ansible_user: adminAnsible1
      ansible_ssh_private_key_file: >
        /home/comardom/.ssh/comardom.top.pem
      ansible_become: true
      ansible_become_method: sudo
      ansible_become_user: root
      ansible_ssh_common_args: '-o StrictHostKeyChecking=no'
      ansible_python_interpreter: /usr/bin/python3
    server2:
      ansible_host: 47.93.40.173
      ansible_port: 22222
      ansible_user: adminAnsible2
      ansible_ssh_private_key_file: >
        /home/comardom/.ssh/taskapsule.xyz.pem
      ansible_become: true
      ansible_become_method: sudo
      ansible_become_user: root
      ansible_ssh_common_args: '-o StrictHostKeyChecking=no'
      ansible_python_interpreter: /usr/bin/python3
```
##### hosts清单使用概览
下一节中的Playbook依托于hosts清单，使用Playbook时可以针对同一文件中的不同组等（也就是清单源）。包括具体的参数设置等细节请看[如何构建您的清单](https://docs.ansible.org.cn/ansible/latest/inventory_guide/intro_inventory.html)，此处不进行赘述。
要注意的是，可以设置多个清单文件以分别在不同的环境中使用。
当使用不包含域名的弹性IPv4服务器或者组织IP池时，请看[使用动态清单](https://docs.ansible.org.cn/ansible/latest/inventory_guide/intro_dynamic_inventory.html)。
##### hosts清单中的组别设置
hosts可以是IP，也可以是域名。
Ansible默认创建两个组，all和ungrouped。给组起什么名字是看自己怎么想，主要为了管理方便。如果不想创建组，那所有的hosts就是all；如果有一些hosts没有加入组，那么就自动加入ungrouped。
创建组的逻辑根据三条：服务器拿来干什么、服务器机器在哪、服务器是测试还是生产环境。**可以根据不同的逻辑向不同的组中加入同一台服务器。**
组和组之间既可以是平行关系又可以是父子关系，比如可以在某地区的服务器组内部嵌套测试与生产环境的组。**注意组的父子关系==不可循环但是可以多继承==。**
这是组的嵌套示意，嵌套使用children:条目。
```yaml
ungrouped:
  hosts:
    mail.example.com:
webservers:
  hosts:
    foo.example.com:
    bar.example.com:
dbservers:
  hosts:
    one.example.com:
    two.example.com:
    three.example.com:
east:
  hosts:
    foo.example.com:
    one.example.com:
    two.example.com:
west:
  hosts:
    bar.example.com:
    three.example.com:
prod:
  children:
    east:
test:
  children:
    west:
```
可以使用Python字符串切片的形式包含范围域名，比如这个示例。
```yaml
 webservers:
    hosts:
      www[01:50:2].example.com:
```
其将匹配子域名www01、www03、www05、...、www49。

---

## 试着创建Playbook
接下来是创建playbook，规定自动化操作内容；Ansible默认会并行在所有主机上执行任务，不过默认Ansible仅使用五个并发进程。
此处有清晰的结构脉络，表现为Playbook->Play->Task->module。
```bash
cd ~/AnsibleProjects/serverManagerWithoutEE/
vim playbook.yaml
```
这是playbook的示例配置，用于测试。在YAML中，`-`意味着它后面的内容是某个集合中的其中一个元素，此处name前面的`-`指一个play或一个module。`-`后面记得要加空格。
```yaml
---
# 这是一个Play
- name: My first play
  # 注意这个是服务器组的名字，要和inventory.yaml中对应
  hosts: myhosts
  # 这是Task
  tasks:
    # 这是测试服务器上Python和SSH是否正常的模块
    - name: Ping my hosts
      ansible.builtin.ping:
    # 这是debug模块
    - name: Print message
      ansible.builtin.debug:
        msg: Hello world
```
接下来进行测试，先创建bash脚本再执行。
```bash
vim test_playbook.sh
```
这是脚本内容。
```shell
#!/bin/bash
cd "$(dirname "$0")" || { echo "cannot enter dir"; exit 1; }
ansible-playbook -i inventory.yaml playbook.yaml
```
修改权限并运行测试。
```bash
chmod +x 'test_playbook.sh'
sh test_playbook.sh
```
