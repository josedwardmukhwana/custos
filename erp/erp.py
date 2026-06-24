import sys
import os

sys.path.append(os.path.dirname(os.path.realpath(__file__)))

import re
import math
import shutil
import otdrparser
import requests
import time
import random
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), 'erp.env')
load_dotenv(dotenv_path=env_path)

def clear_console():
    os.system('cls' if os.name == 'nt' else 'clear')

clear_console()

API_ENDPOINTS = os.getenv("API_ENDPOINT", "").split(",")

class InvalidFormat(ValueError):
    pass

batch_id = None
fibers = []
traces = {}
terminal_width = shutil.get_terminal_size().columns

STAGES = {
    "barefiber": {"prefix": "BF_", "label": "Bare Fiber"},
    "buffering": {"prefix": "BU_", "label": "Buffering"},
    "stranding": {"prefix": "SZ_", "label": "Stranding"},
    "sheathing": {"prefix": "SH_", "label": "Sheathing"},
}

def convert_to_serializable(obj):
    if isinstance(obj, bytes):
        return obj.decode(errors='replace')
    elif isinstance(obj, dict):
        return {k: convert_to_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_serializable(i) for i in obj]
    return obj

def get_events(filename):
    with open(filename, 'rb') as fp:
        blocks = otdrparser.parse(fp)
        serializable_blocks = convert_to_serializable(blocks)
        events_block = [block for block in serializable_blocks if 'KeyEvents' in block.get('name', '')]
        
        if not events_block:
            raise Exception(f"No KeyEvents found in {filename}")
            
        events = events_block[0].get('events', [])
        if len(events) >= 2:
            return [events[1], events[-1]]
        else:
            raise Exception(f'Invalid trace: {filename}')

def process_traces(target_files, stage):
    traces = {}
    color_map = {
        'b': 'Blue', 'or': 'Orange', 'grn': 'Green', 'br': 'Brown', 
        'gry': 'Grey', 'wh': 'White', 'r': 'Red', 'bl': 'Black', 
        'yw': 'Yellow', 'vt': 'Violet', 'pk': 'Pink', 'aq': 'Aqua'
    }

    for filename in target_files:
        identifier = None
        
        if stage == "barefiber":
            match = re.search(r'(.*?)\s+([a-z]+)_(?:1310|1550)\.sor', filename, re.IGNORECASE)
            if match:
                base_id, color_code = match.group(1), match.group(2).lower()
                if color_code in color_map:
                    identifier = f"{base_id} {color_map[color_code]}"
                else:
                    raise ValueError(f"Unknown color code '{color_code}' in {filename}")
            else:
                raise ValueError(f"Barefiber file '{filename}' must follow 'ID color_wavelength.sor' format")
        else:
            match = re.search(r'fiber(\d+)', filename, re.IGNORECASE)
            identifier = int(match.group(1)) if match else filename

        if identifier not in traces:
            traces[identifier] = {'1310': None, '1550': None}
            
        if '1310' in filename: traces[identifier]['1310'] = filename
        elif '1550' in filename: traces[identifier]['1550'] = filename

    print(f'Found {len(traces)} fiber pairs to process')
    print('-' * terminal_width)

    def sort_key(item):
        val = item[0]
        try:
            return (0, int(val))
        except (ValueError, TypeError):
            return (1, val)

    for identifier, files in sorted(traces.items(), key=sort_key):
        try:
            if not files['1310'] or not files['1550']: continue
            ev_1310 = get_events(files['1310'])
            att_1310 = round(float(ev_1310[-1]['slope']), 3)
            ev_1550 = get_events(files['1550'])
            att_1550 = round(float(ev_1550[-1]['slope']), 3)
            
            length = math.floor(ev_1550[-1]['distance_of_travel']) - math.floor(ev_1550[0]['distance_of_travel'])

            fibers.append({"no": identifier, "1310": att_1310, "1550": att_1550, "length": length})
            
            if stage == "barefiber":
                print(f"{identifier}: {att_1310} (1310) | {att_1550} (1550) | {length}m")
            else:
                print(f"Fiber {identifier}: {att_1310} (1310) | {att_1550} (1550) | {length}m")
                
        except Exception as e:
            print(f"Error fiber {identifier}: {e}")

def get_smart_env(key, prompt, is_bool=False, is_float=False):
    val = os.getenv(key)
    if val is not None and val.strip() != "":
        if is_bool: return val.lower() in ['true', '1', 'y', 'yes']
        if is_float: return float(val)
        return val
    
    user_val = input(prompt).strip()
    if is_bool: return user_val.lower() in ['true', '1', 'y', 'yes']
    if is_float: return float(user_val)
    print('-' * terminal_width)
    return user_val

def get_technician_name():
    tech_input = get_smart_env("TECHNICIAN_NAME", "Technician Name / Initials: ").lower()
    name_mapping = {
        'a': 'Amon Kibet', 'j': 'Josedward Mukhwana', 'v': 'Victor Kipchumba',
        's': "Sharon Chepng'eno", 'l': 'Linet Chepkoech', 'e': 'Emmanuel Kipkoech',
        'd': 'Denis Korir', 'g': 'Gloria Kaplelach', 'f': 'Faith Assava',
        'ko': 'Kevin Otieno', 'i': 'Isaac Alukhaba', 'an': 'Antony Ndolo',
        'dc': 'Diana Chepkoech', 's': 'Samuel'
    }
    return name_mapping.get(tech_input, tech_input).upper()

def get_production_data(stage):
    print(f"LOADING {stage.upper()} PRODUCTION DATA...")
    print("-" * terminal_width)
    prefix = STAGES[stage]["prefix"]
    tech_name = get_technician_name()

    common = {"technician_Name": tech_name, "otdr_No": get_smart_env(f"OTDR_NO", "OTDR No: "), "comment": get_smart_env("COMMENT", "Comment: ")}

    if stage == "barefiber":
        return {
            **common,
            "code": get_smart_env(f"{prefix}CODE", "Code: "),
            "supplier": get_smart_env(f"{prefix}SUPPLIER", "Supplier: "),
            "fiber_Type": get_smart_env(f"{prefix}FIBER_TYPE", "Fiber Type: "),
        }

    common["shift"] = get_smart_env("SHIFT", "Shift: ")

    if stage == "buffering":
        return {
            **common,
            "equipment_ID": get_smart_env("EQUIPMENT_ID", "Equipment ID: ")
        }
    elif stage == "stranding":
        return {
            **common,
            "equipment_ID": get_smart_env("EQUIPMENT_ID", "Equipment ID: "),
            "length_Type": get_smart_env(f"{prefix}LENGTH_TYPE", "Length Type (single/double): "),
            "test_Side": get_smart_env(f"{prefix}TEST_SIDE", "Test Side (top/bottom): "),
        }
    elif stage == "sheathing":
        return {
            **common,
            "cable_Type": get_smart_env(f"{prefix}CABLE_TYPE", "Cable Type: "),
            "net_Weight": get_smart_env(f"{prefix}NET_WEIGHT", "Net Weight: "),
            "drum_Weight": get_smart_env(f"{prefix}DRUM_WEIGHT", "Drum Weight: "),
        }

def get_observation_data(stage):
    prefix = STAGES[stage]["prefix"]

    try:
        if stage == "barefiber": return

        if stage == "buffering":
            return {
                "id": int(get_smart_env(f"{prefix}BASE_ID", "ID: ", is_float=True)),
                "od": get_smart_env("BASE_OD", "OD (mm): ", is_float=True),
                "thickness": get_smart_env("BASE_THICKNESS", "Thickness (mm): ", is_float=True),
                "physical": get_smart_env(f"{prefix}PHYSICAL_OK", "Physical OK? (y/n): ", is_bool=True),
                "color": get_smart_env(f"{prefix}COLOR_OK", "Color OK? (y/n): ", is_bool=True),
                "jelly": get_smart_env(f"{prefix}JELLY_OK", "Jelly OK? (y/n): ", is_bool=True),
                "circular": get_smart_env(f"{prefix}CIRCULAR_OK", "Circular OK? (y/n): ", is_bool=True),
            }

        if stage == "stranding":
            obs = {
                "od": get_smart_env("BASE_OD", "OD (mm): ", is_float=True),
                "frp": get_smart_env(f"{prefix}BASE_FRP", "FRP (mm): ", is_float=True),
                "csm": get_smart_env(f"{prefix}CSM_PRESENT", "CSM Present? (y/n): ", is_bool=True),
            }
            if get_smart_env(f"{prefix}FILLER_PRESENT", "Filler Present? (y/n): ", is_bool=True):
                obs["filler"] = {"present": True, "count": int(get_smart_env(f"{prefix}FILLER_COUNT", "Filler Count: "))}
            else:
                obs["filler"] = False
            obs["yarns"] = [
                {"type": "water blocking", "present": get_smart_env(f"{prefix}YARN_WB_PRESENT", "Water Blocking Yarn present? (y/n): ", is_bool=True), "count": int(get_smart_env(f"{prefix}YARN_WB_COUNT", "Water Blocking Yarn count: "))},
                {"type": "binder", "present": get_smart_env(f"{prefix}YARN_BINDER_PRESENT", "Binder Yarn present? (y/n): ", is_bool=True), "count": int(get_smart_env(f"{prefix}YARN_BINDER_COUNT", "Binder Yarn count: "))},
            ]
            obs["tapes"] = [
                {"type": "water swellable", "present": get_smart_env(f"{prefix}TAPE_WS_PRESENT", "Water Swellable Tape present? (y/n): ", is_bool=True), "count": int(get_smart_env(f"{prefix}TAPE_WS_COUNT", "Water Swellable Tape count: "))},
                {"type": "identification", "present": get_smart_env(f"{prefix}TAPE_ID_PRESENT", "Identification Tape present? (y/n): ", is_bool=True), "count": int(get_smart_env(f"{prefix}TAPE_ID_COUNT", "Identification Tape count: "))},
            ]
            return obs

        if stage == "sheathing":
            obs = {
                "od": get_smart_env("BASE_OD", "OD (mm): ", is_float=True),
                "thickness": get_smart_env("BASE_THICKNESS", "Thickness (mm): ", is_float=True),
                "printing": get_smart_env(f"{prefix}PRINTING_OK", "Is Printing OK? (y/n): ", is_bool=True),
                "yarn": get_smart_env(f"{prefix}YARN_TYPE", "Yarn Type: "),
                "physical": get_smart_env(f"{prefix}PHYSICAL_OK", "Is Physical Condition OK? (y/n): ", is_bool=True),
            }
            if get_smart_env(f"{prefix}RIPCORD_PRESENT", "Ripcord present? (y/n): ", is_bool=True):
                obs["ripcord"] = {"present": True, "count": int(os.getenv(f"{prefix}RIPCORD_COUNT", "1"))}
            else:
                obs["ripcord"] = False
            return obs

    except ValueError as e:
        raise InvalidFormat(f"Invalid numerical input: {e}")

def confirm_details(stage, content):
    print("\n" + "=" * terminal_width)
    print(f" {stage.upper()} DETAILS SUMMARY ".center(terminal_width, " "))
    print("=" * terminal_width)
    print(f" {'Batch ID':<25} => {batch_id}")

    for k, v in content.items():
        if k == 'fibers':
            continue
        if k == 'observations':
            print("-" * terminal_width)
            print(f" {stage.upper()} OBSERVATIONS SUMMARY ".center(terminal_width, " "))
            print("-" * terminal_width)
            for ok, ov in v.items():
                if ok not in ('yarns', 'tapes', 'ripcord'):
                    print(f" {ok.split('_')[0].upper() + ' ' + ok.split('_')[1].upper() if '_' in ok else ok.upper():<25} => {ov}")
            continue
        print(f" {k.split('_')[0].upper() + ' ' + k.split('_')[1].upper() if '_' in k else k.upper():<25} => {v}")

    print("=" * terminal_width)
    choice = input("Proceed with transmission? (y/n): ").strip().lower()
    print("-" * terminal_width)
    if choice != 'y':
        print("Aborted by user.")
        exit()

def transmit_payload(payload):
    for i, endpoint in enumerate(API_ENDPOINTS):
        print("-" * terminal_width)
        try:
            print(f"Trying server: {endpoint}")
            print("-" * terminal_width)
            response = requests.post(endpoint + "/record", json=payload, timeout=120)

            if response.status_code == 200:
                print(f"SUCCESS ({endpoint}): {response.json().get('message')}")
                return True
            else:
                print(f"ERROR ({endpoint}): {response.json().get('message', response.text)}")
        except Exception as e:
            print(f"Failed to reach {endpoint}: {e}")

        print("-" * terminal_width)
        wait_time = 2 ** i + random.random()
        print(f"Waiting {wait_time:.1f}s before next server...")
        print("-" * terminal_width)
        time.sleep(wait_time)

    print("All servers failed.")
    return False

if __name__ == "__main__":
    try:
        current_dir = os.getcwd()
        batch_id = os.path.basename(current_dir)

        print("-" * terminal_width)
        print("ERP TRANSMITTER".center(terminal_width))
        print("=" * terminal_width)

        print("SELECT STAGE:")
        print("-" * terminal_width)
        options = [f"{i+1}. {s['label']}" for i, s in enumerate(STAGES.values())]
        print("\n".join(options))
        print("-" * terminal_width)
        mode = input("Choice: ").strip()
        print("-" * terminal_width)

        stage_list = list(STAGES.keys())
        stage = stage_list[int(mode) - 1] if mode.isdigit() and 1 <= int(mode) <= len(stage_list) else None
        if not stage:
            raise ValueError("Invalid stage selection")

        content = get_production_data(stage)
        obs = get_observation_data(stage)
        if obs:
            content["observations"] = obs

        confirm_details(stage, content)

        sor_files = [f for f in os.listdir(current_dir) if f.endswith('.sor')]
        if not sor_files:
            print("No .sor files found.")
            exit()

        process_traces(sor_files, stage)
        content["fibers"] = fibers

        if stage == "stranding" and fibers:
            content["minLength"] = min(f["length"] for f in fibers)

        payload = {"id": batch_id, "stage": stage, "content": content}

        print("-" * terminal_width)
        print(f"Transmission: {batch_id} ({stage.upper()}) -> Custos")

        transmit_payload(payload)

        print("-" * terminal_width)
        print("Exiting in 3 seconds...")
        time.sleep(3)

    except Exception as e:
        print(f"Fatal: {e}")
        input("Press Enter to exit...")