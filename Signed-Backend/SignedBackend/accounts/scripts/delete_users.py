import asyncio
from accounts.firebase_admin import auth
import requests

API_URL = "http://127.0.0.1:8000/api/v1/users/auth/delete/direct/"  


# add in emails of accounts to delete. If non-empty, the script will delete all accounts in 
# this list
DELETE = []

# add in emails to accounts to whitelist. If non-empty, the script will delete all acccounts except
# for the ones in this list.
WHITELIST =[]

users_deleted = 0

async def delete_user(user):    
    data = {
        "email": user.email
    }

    try:
        response = requests.post(API_URL, data=data)
        await asyncio.to_thread(auth.delete_user, user.uid)
    except:
        print(f'Error occurred while trying to delete {user.email}')

    print(f'Deleted {user.email}')
    global users_deleted
    users_deleted += 1


async def main():
    users = list(auth.list_users().iterate_all())

    tasks = []

    if len(DELETE) > 0:
        for user in users:
            if user.email in DELETE:
                tasks.append(delete_user(user))

    elif len(WHITELIST) > 0:
        for user in users:
            if user.email not in WHITELIST:
                tasks.append(delete_user(user))
    else:
        tasks = [delete_user(user) for user in users]

    await asyncio.gather(*tasks)

    print(f'Deleted {users_deleted} users.')

if __name__ == "__main__":
    asyncio.run(main())
